/**
 * Query Planner: Optimize trajectory search
 * 
 * Determines optimal parameters: topK, minQuality, efSearch
 * Based on selectivity estimation and cost modeling.
 * 
 * @see docs/formula.md §Query Planning
 */

export interface QueryPlan {
  topK: number
  minQuality: number
  efSearch: number
  estimatedCost: number
  estimatedResults: number
}

export interface PlannerConfig {
  defaultTopK?: number
  defaultMinQuality?: number
  defaultEfSearch?: number
}

export interface DatasetStats {
  totalSpans?: number
  avgQuality?: number
  qualityDistribution?: Map<number, number> // bucket -> count
  actionCounts?: Map<string, number>
  domainCounts?: Map<string, number>
}

/**
 * Query Planner
 * 
 * Optimizes search parameters based on query characteristics
 * and dataset statistics.
 */
export class Planner {
  private config: Required<PlannerConfig>
  
  constructor(config: PlannerConfig = {}) {
    this.config = {
      defaultTopK: config.defaultTopK || 10,
      defaultMinQuality: config.defaultMinQuality || 70,
      defaultEfSearch: config.defaultEfSearch || 50,
    }
  }
  
  /**
   * Generate query plan
   * 
   * Considers:
   * - Query complexity
   * - Dataset size and distribution
   * - Required accuracy vs speed trade-off
   * 
   * @param query - Query object with filters and requirements
   * @param datasetStats - Statistics about the dataset
   * @returns Optimized query plan
   * 
   * @see docs/formula.md §Query Plan Generation
   */
  plan(query: any, datasetStats: DatasetStats): QueryPlan {
    // Extract query parameters
    const requestedTopK = query.topK || this.config.defaultTopK
    const requestedMinQuality = query.minQuality || this.config.defaultMinQuality
    const filters = query.filters || {}
    
    // Estimate selectivity (fraction of dataset matching filters)
    const selectivity = this.estimateSelectivity(filters, datasetStats)
    
    // Estimate number of results after filtering
    const totalSpans = datasetStats.totalSpans || 1000
    const estimatedResults = Math.ceil(totalSpans * selectivity)
    
    // Adjust topK if filtered results are limited
    const adjustedTopK = Math.min(requestedTopK, estimatedResults)
    
    // Calculate efSearch based on desired recall
    // Higher efSearch = better recall but slower
    // Rule of thumb: efSearch = topK * 2-5 depending on dataset size
    const efSearchMultiplier = this.getEfSearchMultiplier(totalSpans, selectivity)
    const efSearch = Math.max(
      this.config.defaultEfSearch,
      Math.ceil(adjustedTopK * efSearchMultiplier)
    )
    
    // Estimate computational cost
    const estimatedCost = this.estimateCost(
      adjustedTopK,
      efSearch,
      selectivity,
      totalSpans
    )
    
    return {
      topK: adjustedTopK,
      minQuality: requestedMinQuality,
      efSearch,
      estimatedCost,
      estimatedResults,
    }
  }
  
  /**
   * Estimate selectivity for filters
   * 
   * Calculates fraction of dataset matching given filters.
   * Uses statistics when available, falls back to heuristics.
   * 
   * @param filters - Query filters
   * @param datasetStats - Dataset statistics
   * @returns Selectivity [0, 1]
   * 
   * @see docs/formula.md §Selectivity Estimation
   */
  private estimateSelectivity(filters: any, datasetStats: DatasetStats): number {
    let selectivity = 1.0 // Start with full dataset
    
    // Quality filter selectivity
    if (filters.minQuality !== undefined && datasetStats.qualityDistribution) {
      const qualitySelectivity = this.estimateQualitySelectivity(
        filters.minQuality,
        datasetStats.qualityDistribution
      )
      selectivity *= qualitySelectivity
    }
    
    // Action filter selectivity
    if (filters.action && datasetStats.actionCounts) {
      const actionSelectivity = this.estimateActionSelectivity(
        filters.action,
        datasetStats.actionCounts,
        datasetStats.totalSpans || 1000
      )
      selectivity *= actionSelectivity
    }
    
    // Domain filter selectivity
    if (filters.domain && datasetStats.domainCounts) {
      const domainSelectivity = this.estimateDomainSelectivity(
        filters.domain,
        datasetStats.domainCounts,
        datasetStats.totalSpans || 1000
      )
      selectivity *= domainSelectivity
    }
    
    // Time range filter (heuristic: ~20% of data if no stats)
    if (filters.timeRange) {
      selectivity *= 0.2
    }
    
    return Math.max(0.01, Math.min(1.0, selectivity))
  }
  
  /**
   * Estimate selectivity for quality filter
   */
  private estimateQualitySelectivity(
    minQuality: number,
    distribution: Map<number, number>
  ): number {
    let totalCount = 0
    let matchingCount = 0
    
    for (const [bucket, count] of distribution.entries()) {
      totalCount += count
      if (bucket >= minQuality) {
        matchingCount += count
      }
    }
    
    return totalCount > 0 ? matchingCount / totalCount : 0.5
  }
  
  /**
   * Estimate selectivity for action filter
   */
  private estimateActionSelectivity(
    action: string,
    actionCounts: Map<string, number>,
    totalSpans: number
  ): number {
    const count = actionCounts.get(action) || 0
    return count / totalSpans
  }
  
  /**
   * Estimate selectivity for domain filter
   */
  private estimateDomainSelectivity(
    domain: string,
    domainCounts: Map<string, number>,
    totalSpans: number
  ): number {
    const count = domainCounts.get(domain) || 0
    return count / totalSpans
  }
  
  /**
   * Get efSearch multiplier based on dataset characteristics
   * 
   * Larger datasets and lower selectivity require higher efSearch
   * for good recall.
   */
  private getEfSearchMultiplier(totalSpans: number, selectivity: number): number {
    // Base multiplier
    let multiplier = 2.0
    
    // Increase for large datasets (harder search)
    if (totalSpans > 100000) {
      multiplier = 5.0
    } else if (totalSpans > 10000) {
      multiplier = 3.0
    }
    
    // Increase for low selectivity (need to explore more)
    if (selectivity < 0.1) {
      multiplier *= 1.5
    }
    
    return multiplier
  }
  
  /**
   * Estimate computational cost
   * 
   * Factors:
   * - Vector search cost: O(efSearch * log(N))
   * - Filter cost: O(N * selectivity)
   * - Post-processing: O(topK)
   * 
   * Returns cost in arbitrary units (higher = more expensive)
   */
  private estimateCost(
    topK: number,
    efSearch: number,
    selectivity: number,
    totalSpans: number
  ): number {
    // Vector search cost (HNSW)
    const vectorSearchCost = efSearch * Math.log2(totalSpans + 1)
    
    // Filter application cost
    const filterCost = totalSpans * selectivity
    
    // Ranking and post-processing cost
    const postProcessCost = topK * Math.log2(topK + 1)
    
    // Combine costs with weights
    const totalCost = vectorSearchCost * 0.6 + filterCost * 0.3 + postProcessCost * 0.1
    
    return Math.ceil(totalCost)
  }
}
