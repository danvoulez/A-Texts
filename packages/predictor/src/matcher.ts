/**
 * Trajectory Matcher: Core prediction algorithm
 * 
 * Implements the trajectory matching pipeline described in Formula.md:
 * 1. Embed query using deterministic TF-IDF-based embedding
 * 2. Find similar trajectories using vector search (HNSW/IVF)
 * 3. Apply filters (inverted, temporal, quality)
 * 4. Rank and select top-K evidence
 * 5. Synthesize prediction from evidence
 * 6. Calculate confidence with short-circuit for low quality
 * 
 * @see docs/formula.md §Trajectory Matching
 */

import type { HNSWIndex } from '@arenalab/search'
import type { InvertedIndex, TemporalIndex, QualityIndex } from '@arenalab/search'
import { embed, cosineSimilarity } from '@arenalab/utils'

/**
 * Evidence item from trajectory matching
 */
export interface Evidence {
  id: string
  score: number
  content: string
  metadata?: Record<string, any>
}

/**
 * Search plan and parameters
 */
export interface SearchPlan {
  topK: number
  minQuality: number
  timeRange?: { start: Date; end: Date }
  filters?: Record<string, string>
}

/**
 * Prediction result from trajectory matching
 */
export interface Prediction {
  output: string
  confidence: number
  trajectories_used: number
  method: 'trajectory_matching' | 'synthesis' | 'fallback' | 'low_confidence'
  evidence?: Evidence[]
  plan?: SearchPlan
}

/**
 * Configuration for trajectory matcher
 */
export interface MatcherConfig {
  minTopK?: number        // Minimum topK to proceed (default: 3)
  minScore?: number       // Minimum evidence score (default: 0.3)
  minConfidence?: number  // Minimum confidence threshold (default: 20)
  embeddingDim?: number   // Embedding dimensions (default: 384)
  defaultTopK?: number    // Default topK if not in plan (default: 10)
}

/**
 * Trajectory Matcher
 * 
 * Core prediction engine using trajectory matching.
 * Integrates vector search, inverted indices, and evidence synthesis.
 */
export class TrajectoryMatcher {
  private config: Required<MatcherConfig>
  private vectorIndex?: HNSWIndex
  private invertedIndex?: InvertedIndex
  private temporalIndex?: TemporalIndex
  private qualityIndex?: QualityIndex
  private spans: Map<string, any> = new Map()
  
  constructor(config: MatcherConfig = {}) {
    this.config = {
      minTopK: config.minTopK ?? 3,
      minScore: config.minScore ?? 0.3,
      minConfidence: config.minConfidence ?? 20,
      embeddingDim: config.embeddingDim ?? 384,
      defaultTopK: config.defaultTopK ?? 10,
    }
  }
  
  /**
   * Set indices for search
   * 
   * @param indices - Object containing search indices
   */
  setIndices(indices: {
    vector?: HNSWIndex
    inverted?: InvertedIndex
    temporal?: TemporalIndex
    quality?: QualityIndex
  }): void {
    this.vectorIndex = indices.vector
    this.invertedIndex = indices.inverted
    this.temporalIndex = indices.temporal
    this.qualityIndex = indices.quality
  }
  
  /**
   * Add span to matcher's dataset
   * 
   * @param span - Span object with id, content, and metadata
   */
  async addSpan(span: any): Promise<void> {
    this.spans.set(span.id, span)
    
    // Add to vector index
    if (this.vectorIndex) {
      const spanText = this.spanToText(span)
      const embedding = embed(spanText, this.config.embeddingDim)
      await this.vectorIndex.insert(span.id, Array.from(embedding))
    }
    
    // Add to inverted index
    if (this.invertedIndex && span.did) {
      this.invertedIndex.add(span.id, 'action', span.did)
    }
    if (this.invertedIndex && span.context?.environment) {
      this.invertedIndex.add(span.id, 'domain', span.context.environment)
    }
    
    // Add to temporal index
    if (this.temporalIndex && span.when) {
      this.temporalIndex.add(span.id, new Date(span.when))
    }
    
    // Add to quality index (if quality metadata exists)
    if (this.qualityIndex && span.quality?.total_score !== undefined) {
      this.qualityIndex.add(span.id, span.quality.total_score)
    }
  }
  
  /**
   * Main prediction method
   * 
   * Implements the full trajectory matching pipeline:
   * 1. Create search plan
   * 2. Short-circuit check (topK, quality)
   * 3. Find similar trajectories via vector search
   * 4. Apply filters (action, temporal, quality)
   * 5. Collect evidence with scores
   * 6. Synthesize prediction
   * 7. Calculate confidence
   * 
   * @param context - Context object (environment, stakes, etc.)
   * @param action - Action/query string
   * @param plan - Optional search plan override
   * @returns Prediction with confidence and evidence
   * 
   * @see docs/formula.md §Trajectory Matching Pipeline
   */
  async predict(
    context: any,
    action: string,
    plan?: SearchPlan
  ): Promise<Prediction> {
    // Default plan
    const searchPlan: SearchPlan = plan || {
      topK: this.config.defaultTopK,
      minQuality: 60, // Minimum quality score of 60/100
    }
    
    // Short-circuit: Check if plan meets minimum requirements
    if (searchPlan.topK < this.config.minTopK) {
      return {
        output: 'Insufficient search parameters. Please request more results.',
        confidence: 10,
        trajectories_used: 0,
        method: 'low_confidence',
        plan: searchPlan,
      }
    }
    
    // Step 1: Embed query
    const queryText = this.contextToText(context, action)
    const queryEmbedding = embed(queryText, this.config.embeddingDim)
    
    // Step 2: Vector search for similar trajectories
    let candidateIds: string[]
    
    if (this.vectorIndex && this.vectorIndex.size() > 0) {
      const searchResults = await this.vectorIndex.search(
        Array.from(queryEmbedding),
        searchPlan.topK * 3 // Get more candidates for filtering
      )
      candidateIds = searchResults.map(r => r.id)
    } else {
      // Fallback: use all spans if no vector index
      candidateIds = Array.from(this.spans.keys())
    }
    
    // Step 3: Apply inverted filters
    if (this.invertedIndex && action) {
      candidateIds = this.invertedIndex.filterByAction(candidateIds, action, true)
    }
    
    // Step 4: Apply temporal filter
    if (this.temporalIndex && searchPlan.timeRange) {
      const temporalIds = this.temporalIndex.findInRange(searchPlan.timeRange)
      const temporalSet = new Set(temporalIds)
      candidateIds = candidateIds.filter(id => temporalSet.has(id))
    }
    
    // Step 5: Apply quality filter
    if (this.qualityIndex && searchPlan.minQuality) {
      const qualityIds = this.qualityIndex.findAbove(searchPlan.minQuality)
      const qualitySet = new Set(qualityIds)
      candidateIds = candidateIds.filter(id => qualitySet.has(id))
    }
    
    // Short-circuit: If too few candidates after filtering
    if (candidateIds.length === 0) {
      return {
        output: 'No matching trajectories found. Please try a different query or relax filters.',
        confidence: 5,
        trajectories_used: 0,
        method: 'low_confidence',
        plan: searchPlan,
      }
    }
    
    // Step 6: Collect evidence with scores
    const evidence: Evidence[] = []
    
    for (const id of candidateIds.slice(0, searchPlan.topK)) {
      const span = this.spans.get(id)
      if (!span) continue
      
      // Calculate relevance score
      const spanText = this.spanToText(span)
      const spanEmbedding = embed(spanText, this.config.embeddingDim)
      const score = cosineSimilarity(queryEmbedding, spanEmbedding)
      
      // Skip low-scoring evidence
      if (score < this.config.minScore) {
        continue
      }
      
      evidence.push({
        id: span.id,
        score,
        content: span.if_ok || span.if_not || spanText,
        metadata: {
          action: span.did,
          status: span.status,
          quality: span.quality?.total_score,
          when: span.when,
        },
      })
    }
    
    // Short-circuit: If no high-quality evidence
    if (evidence.length === 0) {
      return {
        output: 'Found trajectories but confidence too low. Unable to provide reliable prediction.',
        confidence: 15,
        trajectories_used: candidateIds.length,
        method: 'low_confidence',
        evidence: [],
        plan: searchPlan,
      }
    }
    
    // Step 7: Synthesize prediction from evidence
    const output = this.synthesize(evidence, context, action)
    
    // Step 8: Calculate confidence
    const confidence = this.calculateConfidence(evidence, candidateIds.length)
    
    // Final short-circuit: If confidence below threshold
    if (confidence < this.config.minConfidence) {
      return {
        output: `Low confidence (${confidence.toFixed(0)}%). Suggested answer: ${output}`,
        confidence,
        trajectories_used: evidence.length,
        method: 'low_confidence',
        evidence,
        plan: searchPlan,
      }
    }
    
    return {
      output,
      confidence,
      trajectories_used: evidence.length,
      method: 'trajectory_matching',
      evidence,
      plan: searchPlan,
    }
  }
  
  /**
   * Synthesize prediction from evidence
   * 
   * Strategy:
   * 1. If top evidence has high score (>0.8), use it directly
   * 2. If multiple similar outcomes, pick most common
   * 3. Otherwise, synthesize from top 3 evidence items
   * 
   * @param evidence - Array of evidence items
   * @param context - Original context
   * @param action - Original action
   * @returns Synthesized output string
   */
  private synthesize(evidence: Evidence[], context: any, action: string): string {
    if (evidence.length === 0) {
      return 'Unable to generate prediction from available data.'
    }
    
    // Sort by score descending
    const sorted = [...evidence].sort((a, b) => b.score - a.score)
    
    // High confidence: use top result
    if (sorted[0].score > 0.8) {
      return sorted[0].content
    }
    
    // Multiple evidence: find consensus
    if (sorted.length >= 3) {
      // Group by outcome similarity
      const outcomes = sorted.slice(0, 5).map(e => e.content)
      const mostCommon = this.findMostCommonOutcome(outcomes)
      return mostCommon
    }
    
    // Fallback: return top result
    return sorted[0].content
  }
  
  /**
   * Find most common outcome from list (simple heuristic)
   */
  private findMostCommonOutcome(outcomes: string[]): string {
    if (outcomes.length === 0) return ''
    
    // Count exact matches
    const counts = new Map<string, number>()
    for (const outcome of outcomes) {
      counts.set(outcome, (counts.get(outcome) || 0) + 1)
    }
    
    // Return most frequent
    let maxCount = 0
    let mostCommon = outcomes[0]
    
    for (const [outcome, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count
        mostCommon = outcome
      }
    }
    
    return mostCommon
  }
  
  /**
   * Calculate confidence from evidence
   * 
   * Factors:
   * - Average evidence score (0-1)
   * - Number of evidence items
   * - Score variance (lower is better)
   * 
   * @param evidence - Array of evidence items
   * @param totalCandidates - Total number of candidates before ranking
   * @returns Confidence score [0-100]
   */
  private calculateConfidence(evidence: Evidence[], totalCandidates: number): number {
    if (evidence.length === 0) return 0
    
    // Average score
    const avgScore = evidence.reduce((sum, e) => sum + e.score, 0) / evidence.length
    
    // Evidence count factor (more is better, up to a point)
    const countFactor = Math.min(evidence.length / 5, 1.0)
    
    // Score variance (lower variance = more agreement = higher confidence)
    const variance = evidence.reduce((sum, e) => {
      const diff = e.score - avgScore
      return sum + diff * diff
    }, 0) / evidence.length
    const varianceFactor = Math.exp(-variance * 5) // Exponential decay
    
    // Combine factors
    const rawConfidence = avgScore * 0.6 + countFactor * 0.2 + varianceFactor * 0.2
    
    // Scale to 0-100
    return Math.max(0, Math.min(100, rawConfidence * 100))
  }
  
  /**
   * Convert span to text for embedding
   */
  private spanToText(span: any): string {
    const parts: string[] = []
    
    if (span.who) parts.push(span.who)
    if (span.did) parts.push(span.did)
    if (span.this) parts.push(span.this)
    if (span.if_ok) parts.push(span.if_ok)
    if (span.context?.environment) parts.push(span.context.environment)
    
    return parts.join(' ')
  }
  
  /**
   * Convert context and action to text for embedding
   */
  private contextToText(context: any, action: string): string {
    const parts: string[] = [action]
    
    if (context.environment) parts.push(context.environment)
    if (context.stakes) parts.push(context.stakes)
    if (context.previous_actions) {
      parts.push(context.previous_actions.join(' '))
    }
    
    return parts.join(' ')
  }
}
