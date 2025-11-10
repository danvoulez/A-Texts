/**
 * IVF: Inverted File Index
 * 
 * For large-scale vector search (millions of vectors).
 * Uses K-means clustering to partition space and reduce search scope.
 * Falls back to exact search if centroids not built.
 * 
 * @see docs/formula.md §Trajectory Matching - Vector Search (IVF)
 */

export interface IVFConfig {
  nClusters?: number  // Number of clusters (default: 100)
  nProbe?: number     // Clusters to search (default: 10)
  maxIter?: number    // Max K-means iterations (default: 20)
}

export interface SearchResult {
  id: string
  distance: number
  similarity: number
}

/**
 * IVF Index for large-scale approximate nearest neighbor search
 */
export class IVFIndex {
  private config: Required<IVFConfig>
  private centroids: number[][] = []
  private clusters: Map<number, string[]> = new Map()
  private vectors: Map<string, number[]> = new Map()
  private built: boolean = false
  
  constructor(config: IVFConfig = {}) {
    this.config = {
      nClusters: config.nClusters || 100,
      nProbe: config.nProbe || 10,
      maxIter: config.maxIter || 20,
    }
  }
  
  /**
   * Add vector to index (must call build() after adding all vectors)
   */
  add(id: string, vector: number[]): void {
    this.vectors.set(id, vector)
    this.built = false
  }
  
  /**
   * Build IVF index using K-means clustering
   * 
   * Steps:
   * 1. Run K-means to find cluster centroids
   * 2. Assign each vector to nearest centroid
   * 3. Build inverted lists (cluster -> vector IDs)
   * 
   * @see docs/formula.md §IVF Index Construction
   */
  async build(vectors?: Map<string, number[]>): Promise<void> {
    if (vectors) {
      this.vectors = vectors
    }
    
    if (this.vectors.size === 0) {
      console.warn('IVF: No vectors to build index from')
      return
    }
    
    const vectorArray = Array.from(this.vectors.values())
    const k = Math.min(this.config.nClusters, vectorArray.length)
    
    console.log(`Building IVF index: ${vectorArray.length} vectors, ${k} clusters`)
    
    // Run K-means clustering
    this.centroids = await this.kMeans(vectorArray, k)
    
    // Assign vectors to clusters
    this.clusters.clear()
    for (let i = 0; i < k; i++) {
      this.clusters.set(i, [])
    }
    
    for (const [id, vector] of this.vectors.entries()) {
      const clusterIdx = this.findNearestCentroid(vector)
      this.clusters.get(clusterIdx)!.push(id)
    }
    
    this.built = true
    
    const avgClusterSize = vectorArray.length / k
    console.log(`IVF index built: ${k} clusters, avg size: ${avgClusterSize.toFixed(1)}`)
  }
  
  /**
   * Search using IVF index
   * 
   * Strategy:
   * 1. Find nProbe nearest centroids to query
   * 2. Search only vectors in those clusters
   * 3. Return top K overall
   * 
   * Falls back to exact search if index not built.
   * 
   * @param query - Query vector
   * @param k - Number of neighbors to return
   * @returns Top K nearest neighbors
   */
  async search(query: number[], k: number = 10): Promise<SearchResult[]> {
    if (this.vectors.size === 0) {
      return []
    }
    
    // Fallback: If index not built, use exact search
    if (!this.built || this.centroids.length === 0) {
      return this.exactSearch(query, k)
    }
    
    // Find nProbe nearest centroids
    const nearestCentroids = this.findNearestCentroids(query, this.config.nProbe)
    
    // Search within selected clusters
    const candidates: SearchResult[] = []
    
    for (const clusterIdx of nearestCentroids) {
      const vectorIds = this.clusters.get(clusterIdx) || []
      
      for (const id of vectorIds) {
        const vector = this.vectors.get(id)!
        const similarity = this.cosineSimilarity(query, vector)
        const distance = 1 - similarity
        
        candidates.push({ id, distance, similarity })
      }
    }
    
    // Sort by distance and return top K
    return candidates
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k)
  }
  
  /**
   * K-means clustering algorithm
   * 
   * Simple implementation with random initialization.
   * Uses Lloyd's algorithm with early stopping on convergence.
   * 
   * @param vectors - Array of vectors to cluster
   * @param k - Number of clusters
   * @returns Array of k centroid vectors
   */
  private async kMeans(
    vectors: number[][],
    k: number
  ): Promise<number[][]> {
    if (k >= vectors.length) {
      // If k >= n, each vector is its own cluster
      return vectors.slice()
    }
    
    // Initialize centroids with random sampling (k-means++)
    let centroids = this.initializeCentroidsKMeansPlusPlus(vectors, k)
    
    for (let iter = 0; iter < this.config.maxIter; iter++) {
      // Assign vectors to nearest centroid
      const assignments = vectors.map(v =>
        this.findNearestCentroidFrom(v, centroids)
      )
      
      // Recompute centroids
      const newCentroids: number[][] = []
      
      for (let i = 0; i < k; i++) {
        const clusterVectors = vectors.filter((_, idx) => assignments[idx] === i)
        
        if (clusterVectors.length === 0) {
          // Keep old centroid if cluster is empty
          newCentroids.push(centroids[i])
        } else {
          newCentroids.push(this.computeCentroid(clusterVectors))
        }
      }
      
      // Check convergence (max centroid movement)
      const maxChange = this.maxCentroidChange(centroids, newCentroids)
      centroids = newCentroids
      
      if (maxChange < 1e-4) {
        console.log(`K-means converged at iteration ${iter + 1}`)
        break
      }
    }
    
    return centroids
  }
  
  /**
   * Initialize centroids using k-means++ for better initial placement
   */
  private initializeCentroidsKMeansPlusPlus(
    vectors: number[][],
    k: number
  ): number[][] {
    const centroids: number[][] = []
    
    // First centroid: random vector
    centroids.push(vectors[Math.floor(Math.random() * vectors.length)])
    
    // Remaining centroids: weighted by distance to nearest existing centroid
    for (let i = 1; i < k; i++) {
      const distances = vectors.map(v => {
        const nearestDist = Math.min(
          ...centroids.map(c => this.euclideanDistance(v, c))
        )
        return nearestDist * nearestDist // D^2 weighting
      })
      
      // Weighted random selection
      const totalDist = distances.reduce((sum, d) => sum + d, 0)
      let randVal = Math.random() * totalDist
      
      for (let j = 0; j < vectors.length; j++) {
        randVal -= distances[j]
        if (randVal <= 0) {
          centroids.push(vectors[j])
          break
        }
      }
    }
    
    return centroids
  }
  
  /**
   * Compute centroid (mean) of vectors
   */
  private computeCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) {
      throw new Error('Cannot compute centroid of empty set')
    }
    
    const dim = vectors[0].length
    const centroid = new Array(dim).fill(0)
    
    for (const vector of vectors) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += vector[i]
      }
    }
    
    for (let i = 0; i < dim; i++) {
      centroid[i] /= vectors.length
    }
    
    return centroid
  }
  
  /**
   * Find index of nearest centroid to vector
   */
  private findNearestCentroid(vector: number[]): number {
    return this.findNearestCentroidFrom(vector, this.centroids)
  }
  
  /**
   * Find index of nearest centroid from given list
   */
  private findNearestCentroidFrom(
    vector: number[],
    centroids: number[][]
  ): number {
    let minDist = Infinity
    let nearest = 0
    
    for (let i = 0; i < centroids.length; i++) {
      const dist = this.euclideanDistance(vector, centroids[i])
      if (dist < minDist) {
        minDist = dist
        nearest = i
      }
    }
    
    return nearest
  }
  
  /**
   * Find nProbe nearest centroids
   */
  private findNearestCentroids(query: number[], nProbe: number): number[] {
    const distances = this.centroids.map((centroid, idx) => ({
      idx,
      dist: this.euclideanDistance(query, centroid),
    }))
    
    return distances
      .sort((a, b) => a.dist - b.dist)
      .slice(0, nProbe)
      .map(item => item.idx)
  }
  
  /**
   * Exact linear search (fallback)
   */
  private exactSearch(query: number[], k: number): SearchResult[] {
    const results: SearchResult[] = []
    
    for (const [id, vector] of this.vectors.entries()) {
      const similarity = this.cosineSimilarity(query, vector)
      const distance = 1 - similarity
      
      results.push({ id, distance, similarity })
    }
    
    return results
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k)
  }
  
  /**
   * Euclidean distance between vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i]
      sum += diff * diff
    }
    return Math.sqrt(sum)
  }
  
  /**
   * Cosine similarity between vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match')
    }
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    return denominator === 0 ? 0 : dotProduct / denominator
  }
  
  /**
   * Maximum change in centroids
   */
  private maxCentroidChange(
    oldCentroids: number[][],
    newCentroids: number[][]
  ): number {
    let maxChange = 0
    
    for (let i = 0; i < oldCentroids.length; i++) {
      const change = this.euclideanDistance(oldCentroids[i], newCentroids[i])
      maxChange = Math.max(maxChange, change)
    }
    
    return maxChange
  }
  
  size(): number {
    return this.vectors.size
  }
  
  /**
   * Get IVF index statistics
   */
  stats(): {
    vectors: number
    clusters: number
    avgClusterSize: number
    built: boolean
  } {
    const avgSize = this.vectors.size / Math.max(1, this.centroids.length)
    
    return {
      vectors: this.vectors.size,
      clusters: this.centroids.length,
      avgClusterSize: avgSize,
      built: this.built,
    }
  }
}
