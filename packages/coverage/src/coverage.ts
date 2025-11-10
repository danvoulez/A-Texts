/**
 * Coverage metrics: density, diversity, and gap detection
 * 
 * Measures data coverage in embedding space to identify:
 * - Dense regions (well-represented areas)
 * - Sparse regions (underrepresented areas / gaps)
 * - Diversity (spread of data across space)
 * 
 * @see docs/formula.md §Coverage Analysis
 */

/**
 * Measure density of embeddings in space
 * 
 * Calculates average pairwise distance between embeddings.
 * Lower distance = higher density (embeddings closer together)
 * 
 * Returns normalized score [0, 1] where:
 * - 1.0 = very dense (all embeddings very similar)
 * - 0.0 = very sparse (embeddings far apart)
 * 
 * @param embeddings - Array of embedding vectors
 * @returns Density score [0, 1]
 */
export function measureDensity(embeddings: number[][]): number {
  if (embeddings.length < 2) {
    return 1.0 // Single point is maximally dense
  }
  
  // Calculate average pairwise cosine similarity
  let totalSimilarity = 0
  let count = 0
  
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[j])
      totalSimilarity += similarity
      count++
    }
  }
  
  const avgSimilarity = count > 0 ? totalSimilarity / count : 0
  
  // Map similarity [0, 1] to density [0, 1]
  // High similarity = high density
  return Math.max(0, Math.min(1, avgSimilarity))
}

/**
 * Measure diversity of embeddings in space
 * 
 * Calculates spread using variance of pairwise distances.
 * Higher variance = more diverse (embeddings spread across space)
 * 
 * Returns normalized score [0, 1] where:
 * - 1.0 = very diverse (embeddings spread across entire space)
 * - 0.0 = not diverse (all embeddings clustered)
 * 
 * @param embeddings - Array of embedding vectors
 * @returns Diversity score [0, 1]
 */
export function measureDiversity(embeddings: number[][]): number {
  if (embeddings.length < 2) {
    return 0.0 // Single point has no diversity
  }
  
  // Calculate pairwise distances
  const distances: number[] = []
  
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const dist = euclideanDistance(embeddings[i], embeddings[j])
      distances.push(dist)
    }
  }
  
  if (distances.length === 0) {
    return 0.0
  }
  
  // Calculate variance of distances
  const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length
  const variance = distances.reduce((sum, d) => {
    const diff = d - mean
    return sum + diff * diff
  }, 0) / distances.length
  
  const stdDev = Math.sqrt(variance)
  
  // Normalize: higher stdDev = more diverse
  // Use heuristic: stdDev / mean as coefficient of variation
  const diversityScore = mean > 0 ? Math.min(1, stdDev / mean) : 0
  
  return Math.max(0, Math.min(1, diversityScore))
}

/**
 * Detect gaps (underrepresented regions) in embedding space
 * 
 * Uses clustering approach:
 * 1. Identify clusters of embeddings
 * 2. Find regions far from any cluster center
 * 3. Return centroids of underrepresented regions
 * 
 * @param embeddings - Array of embedding vectors
 * @param threshold - Minimum distance to be considered a gap (default: 0.5)
 * @returns Array of gap centroids (regions to focus on)
 * 
 * @see docs/formula.md §Gap Detection
 */
export function detectGaps(embeddings: number[][], threshold: number = 0.5): number[][] {
  if (embeddings.length === 0) {
    return []
  }
  
  // Simple grid-based approach:
  // 1. Compute bounding box of embeddings
  // 2. Create grid cells
  // 3. Identify empty cells far from data points
  
  const dim = embeddings[0].length
  
  // Compute min/max bounds for each dimension
  const mins = new Array(dim).fill(Infinity)
  const maxs = new Array(dim).fill(-Infinity)
  
  for (const emb of embeddings) {
    for (let d = 0; d < dim; d++) {
      mins[d] = Math.min(mins[d], emb[d])
      maxs[d] = Math.max(maxs[d], emb[d])
    }
  }
  
  // Generate candidate points on a grid
  // For high dimensions, sample random points instead
  const gaps: number[][] = []
  const numSamples = Math.min(100, dim * 10) // Limit sampling
  
  for (let i = 0; i < numSamples; i++) {
    // Random point in bounding box
    const candidate = new Array(dim)
    for (let d = 0; d < dim; d++) {
      candidate[d] = mins[d] + Math.random() * (maxs[d] - mins[d])
    }
    
    // Check distance to nearest embedding
    let minDist = Infinity
    for (const emb of embeddings) {
      const dist = euclideanDistance(candidate, emb)
      minDist = Math.min(minDist, dist)
    }
    
    // If far from all embeddings, it's a gap
    if (minDist > threshold) {
      gaps.push(candidate)
    }
  }
  
  return gaps
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
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
 * Euclidean distance between two vectors
 */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match')
  }
  
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  
  return Math.sqrt(sum)
}
