/**
 * HNSW: Hierarchical Navigable Small World
 * 
 * Vector similarity search index described in Formula.md.
 * O(log N) query time with configurable efSearch parameter.
 */

export interface HNSWConfig {
  M?: number              // Max connections per node (default: 16)
  efConstruction?: number // Construction quality (default: 200)
  efSearch?: number       // Search quality (default: 50)
}

export interface SearchResult {
  id: string
  distance: number
  similarity: number
}

export class HNSWIndex {
  private config: Required<HNSWConfig>
  private vectors: Map<string, number[]> = new Map()
  
  constructor(config: HNSWConfig = {}) {
    this.config = {
      M: config.M || 16,
      efConstruction: config.efConstruction || 200,
      efSearch: config.efSearch || 50,
    }
  }
  
  /**
   * Insert vector into index
   */
  async insert(id: string, vector: number[]): Promise<void> {
    // TODO: Implement actual HNSW insertion
    // For now, simple storage
    this.vectors.set(id, vector)
  }
  
  /**
   * Search for K nearest neighbors
   */
  async search(query: number[], k: number = 10): Promise<SearchResult[]> {
    // TODO: Implement actual HNSW search with efSearch
    // For now, linear scan with cosine similarity
    
    const results: SearchResult[] = []
    
    for (const [id, vector] of this.vectors.entries()) {
      const similarity = this.cosineSimilarity(query, vector)
      const distance = 1 - similarity
      
      results.push({ id, distance, similarity })
    }
    
    // Sort by distance (ascending) and return top K
    return results.sort((a, b) => a.distance - b.distance).slice(0, k)
  }
  
  /**
   * Cosine similarity between two vectors
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
  
  size(): number {
    return this.vectors.size
  }
}
