/**
 * HNSW: Hierarchical Navigable Small World
 * 
 * Vector similarity search index described in Formula.md.
 * O(log N) query time with configurable efSearch parameter.
 * 
 * Implements hierarchical graph structure with greedy search.
 * Falls back to exact search if graph not yet built.
 * 
 * @see docs/formula.md §Trajectory Matching - Vector Search (HNSW)
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

interface HNSWNode {
  id: string
  vector: number[]
  level: number
  connections: string[][] // connections[layer] = array of neighbor IDs
}

/**
 * HNSW Index for approximate nearest neighbor search
 */
export class HNSWIndex {
  private config: Required<HNSWConfig>
  private nodes: Map<string, HNSWNode> = new Map()
  private entryPoint: string | null = null
  private mL: number // Level multiplier for level selection
  
  constructor(config: HNSWConfig = {}) {
    this.config = {
      M: config.M || 16,
      efConstruction: config.efConstruction || 200,
      efSearch: config.efSearch || 50,
    }
    // mL = 1 / ln(M) for exponential level distribution
    this.mL = 1.0 / Math.log(this.config.M)
  }
  
  /**
   * Insert vector into HNSW index
   * 
   * Builds hierarchical graph structure by:
   * 1. Selecting random level for new node
   * 2. Finding nearest neighbors at each level
   * 3. Creating bidirectional connections
   * 4. Pruning connections if over M limit
   * 
   * @param id - Unique identifier for vector
   * @param vector - Embedding vector
   */
  async insert(id: string, vector: number[]): Promise<void> {
    // Select level using exponential decay: P(level) = (1/M)^level
    const level = this.selectLevel()
    
    // Create new node
    const node: HNSWNode = {
      id,
      vector,
      level,
      connections: Array.from({ length: level + 1 }, () => []),
    }
    
    this.nodes.set(id, node)
    
    // If this is the first node, make it entry point
    if (this.entryPoint === null) {
      this.entryPoint = id
      return
    }
    
    // Find nearest neighbors and connect
    const entryNode = this.nodes.get(this.entryPoint)!
    let nearest = [entryNode]
    
    // Search from top layer to target layer
    for (let lc = entryNode.level; lc > level; lc--) {
      nearest = this.searchLayer(vector, nearest, lc, 1)
    }
    
    // Insert node at layers 0..level
    for (let lc = level; lc >= 0; lc--) {
      // Find ef candidates at this layer
      const candidates = this.searchLayer(
        vector,
        nearest,
        lc,
        this.config.efConstruction
      )
      
      // Determine M for this layer (double M for layer 0)
      const M = lc === 0 ? this.config.M * 2 : this.config.M
      
      // Select M best neighbors (greedy heuristic)
      const neighbors = this.selectNeighbors(node.vector, candidates, M)
      
      // Add bidirectional connections
      for (const neighbor of neighbors) {
        node.connections[lc].push(neighbor.id)
        
        const neighborNode = this.nodes.get(neighbor.id)!
        neighborNode.connections[lc].push(id)
        
        // Prune neighbor connections if exceeded M
        if (neighborNode.connections[lc].length > M) {
          neighborNode.connections[lc] = this.pruneConnections(
            neighborNode,
            lc,
            M
          )
        }
      }
      
      nearest = candidates
    }
    
    // Update entry point if new node is at higher level
    if (level > entryNode.level) {
      this.entryPoint = id
    }
  }
  
  /**
   * Search for K nearest neighbors
   * 
   * Uses hierarchical greedy search:
   * 1. Start from entry point at top layer
   * 2. Greedily descend to lower layers
   * 3. At layer 0, perform ef-constrained search
   * 4. Return top K results
   * 
   * Falls back to exact linear search if graph not built.
   * 
   * @param query - Query vector
   * @param k - Number of neighbors to return
   * @returns Top K nearest neighbors
   */
  async search(query: number[], k: number = 10): Promise<SearchResult[]> {
    if (this.nodes.size === 0) {
      return []
    }
    
    // Fallback: If no HNSW graph (single node or not built), use exact search
    if (this.entryPoint === null || this.nodes.size === 1) {
      return this.exactSearch(query, k)
    }
    
    const entryNode = this.nodes.get(this.entryPoint)!
    let nearest = [entryNode]
    
    // Greedy search from top to layer 1
    for (let lc = entryNode.level; lc > 0; lc--) {
      nearest = this.searchLayer(query, nearest, lc, 1)
    }
    
    // Final search at layer 0 with ef >= k
    const ef = Math.max(this.config.efSearch, k)
    nearest = this.searchLayer(query, nearest, 0, ef)
    
    // Convert to search results and return top K
    return nearest
      .slice(0, k)
      .map(node => ({
        id: node.id,
        distance: this.distance(query, node.vector),
        similarity: this.cosineSimilarity(query, node.vector),
      }))
  }
  
  /**
   * Search within a single layer
   * 
   * @param query - Query vector
   * @param entryPoints - Starting nodes for search
   * @param layer - Layer to search in
   * @param ef - Size of dynamic candidate list
   * @returns ef nearest nodes
   */
  private searchLayer(
    query: number[],
    entryPoints: HNSWNode[],
    layer: number,
    ef: number
  ): HNSWNode[] {
    const visited = new Set<string>()
    const candidates: Array<{ node: HNSWNode; dist: number }> = []
    const results: Array<{ node: HNSWNode; dist: number }> = []
    
    // Initialize with entry points
    for (const ep of entryPoints) {
      const dist = this.distance(query, ep.vector)
      candidates.push({ node: ep, dist })
      results.push({ node: ep, dist })
      visited.add(ep.id)
    }
    
    // Sort by distance (ascending)
    candidates.sort((a, b) => a.dist - b.dist)
    results.sort((a, b) => a.dist - b.dist)
    
    while (candidates.length > 0) {
      // Get closest candidate
      const current = candidates.shift()!
      
      // If current is farther than worst result, stop
      if (results.length >= ef && current.dist > results[results.length - 1].dist) {
        break
      }
      
      // Explore neighbors at this layer
      const neighbors = current.node.connections[layer] || []
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue
        visited.add(neighborId)
        
        const neighbor = this.nodes.get(neighborId)!
        const dist = this.distance(query, neighbor.vector)
        
        // Add to results if better than worst or results not full
        if (results.length < ef || dist < results[results.length - 1].dist) {
          candidates.push({ node: neighbor, dist })
          results.push({ node: neighbor, dist })
          
          // Re-sort and keep only ef best
          candidates.sort((a, b) => a.dist - b.dist)
          results.sort((a, b) => a.dist - b.dist)
          if (results.length > ef) {
            results.pop()
          }
        }
      }
    }
    
    return results.map(r => r.node)
  }
  
  /**
   * Exact linear search (fallback when graph not built)
   */
  private exactSearch(query: number[], k: number): SearchResult[] {
    const results: SearchResult[] = []
    
    for (const node of this.nodes.values()) {
      const similarity = this.cosineSimilarity(query, node.vector)
      const distance = 1 - similarity
      
      results.push({ id: node.id, distance, similarity })
    }
    
    // Sort by distance (ascending) and return top K
    return results.sort((a, b) => a.distance - b.distance).slice(0, k)
  }
  
  /**
   * Select M best neighbors using greedy heuristic
   * 
   * Prioritizes closer and more diverse neighbors.
   */
  private selectNeighbors(
    vector: number[],
    candidates: HNSWNode[],
    M: number
  ): HNSWNode[] {
    if (candidates.length <= M) {
      return candidates
    }
    
    // Sort by distance
    const sorted = candidates
      .map(node => ({
        node,
        dist: this.distance(vector, node.vector),
      }))
      .sort((a, b) => a.dist - b.dist)
    
    return sorted.slice(0, M).map(item => item.node)
  }
  
  /**
   * Prune connections to keep only M best neighbors
   */
  private pruneConnections(
    node: HNSWNode,
    layer: number,
    M: number
  ): string[] {
    const connections = node.connections[layer]
    if (connections.length <= M) {
      return connections
    }
    
    // Sort by distance and keep M closest
    const sorted = connections
      .map(id => {
        const neighbor = this.nodes.get(id)!
        return {
          id,
          dist: this.distance(node.vector, neighbor.vector),
        }
      })
      .sort((a, b) => a.dist - b.dist)
    
    return sorted.slice(0, M).map(item => item.id)
  }
  
  /**
   * Select random level for new node
   * Uses exponential decay: P(level) = (1/M)^level
   */
  private selectLevel(): number {
    return Math.floor(-Math.log(Math.random()) * this.mL)
  }
  
  /**
   * Compute distance between vectors (1 - cosine similarity)
   */
  private distance(a: number[], b: number[]): number {
    return 1 - this.cosineSimilarity(a, b)
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
    return this.nodes.size
  }
  
  /**
   * Get statistics about the HNSW graph
   */
  stats(): {
    nodes: number
    layers: number
    avgConnections: number
  } {
    if (this.nodes.size === 0) {
      return { nodes: 0, layers: 0, avgConnections: 0 }
    }
    
    const entryNode = this.entryPoint ? this.nodes.get(this.entryPoint)! : null
    const maxLevel = entryNode ? entryNode.level : 0
    
    let totalConnections = 0
    for (const node of this.nodes.values()) {
      for (const conns of node.connections) {
        totalConnections += conns.length
      }
    }
    
    return {
      nodes: this.nodes.size,
      layers: maxLevel + 1,
      avgConnections: totalConnections / this.nodes.size,
    }
  }
}
