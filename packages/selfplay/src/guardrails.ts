/**
 * Guardrails: Ensure diversity and quality
 * 
 * Prevents adding low-quality or duplicate synthetic data.
 * Enforces minimum distance requirements in embedding space.
 * 
 * @see docs/formula.md §Self-Play - Guardrails
 */

/**
 * Check minimum distance requirement
 * 
 * Ensures new embedding is sufficiently different from existing ones.
 * Prevents near-duplicate synthetic data.
 * 
 * Formula: min(cosine_similarity(new, existing)) < (1 - minDistance)
 * 
 * @param newEmbedding - New embedding to check
 * @param existingEmbeddings - Array of existing embeddings
 * @param minDistance - Minimum required distance [0, 1] (default: 0.3)
 * @returns true if minimum distance satisfied, false otherwise
 * 
 * @see docs/formula.md §Minimum Distance Check
 */
export function checkMinimumDistance(
  newEmbedding: number[],
  existingEmbeddings: number[][],
  minDistance: number = 0.3
): boolean {
  if (existingEmbeddings.length === 0) {
    return true // No existing data, so trivially satisfied
  }
  
  // Check cosine similarity to all existing embeddings
  for (const existing of existingEmbeddings) {
    const similarity = cosineSimilarity(newEmbedding, existing)
    const distance = 1 - similarity
    
    // If too similar (distance too small), reject
    if (distance < minDistance) {
      return false
    }
  }
  
  return true
}

/**
 * Check diversity of a set of embeddings
 * 
 * Ensures that a batch of new embeddings is diverse enough.
 * Uses pairwise distance checks.
 * 
 * @param embeddings - Array of embeddings to check
 * @param minDistance - Minimum required distance between any pair
 * @returns true if all pairs satisfy minimum distance
 */
export function checkBatchDiversity(
  embeddings: number[][],
  minDistance: number = 0.3
): boolean {
  // Check all pairs
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[j])
      const distance = 1 - similarity
      
      if (distance < minDistance) {
        return false // Found a pair that's too similar
      }
    }
  }
  
  return true
}

/**
 * Filter embeddings by minimum distance
 * 
 * Given a set of candidate embeddings, returns subset that satisfies
 * minimum distance requirement (greedy selection).
 * 
 * @param candidates - Array of candidate embeddings
 * @param minDistance - Minimum required distance
 * @returns Filtered array of embeddings
 */
export function filterByMinimumDistance(
  candidates: number[][],
  minDistance: number = 0.3
): number[][] {
  if (candidates.length === 0) {
    return []
  }
  
  const selected: number[][] = [candidates[0]] // Always select first
  
  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i]
    
    // Check if candidate satisfies min distance from all selected
    if (checkMinimumDistance(candidate, selected, minDistance)) {
      selected.push(candidate)
    }
  }
  
  return selected
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
