/**
 * Simple deterministic embedding function
 * 
 * Uses TF-IDF-like approach for offline, CPU-friendly embeddings.
 * Compatible with Edge environments (no ML dependencies).
 * 
 * @see docs/formula.md §Trajectory Matching - Embedding
 */

/**
 * Simple hash function for deterministic embeddings
 */
function simpleHash(str: string, seed: number = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2)
}

/**
 * Create a deterministic embedding from text or object
 * 
 * Uses feature hashing (hashing trick) to create fixed-size vector.
 * This is CPU-friendly, deterministic, and requires no training.
 * 
 * @param input - Text string or object to embed
 * @param dimensions - Embedding dimensions (default: 384, matching MiniLM)
 * @returns Float32Array embedding vector
 */
export function embed(input: string | object, dimensions: number = 384): Float32Array {
  // Convert object to string if needed
  const text = typeof input === 'string' 
    ? input 
    : JSON.stringify(input)
  
  // Tokenize
  const tokens = tokenize(text)
  
  // Create sparse vector using feature hashing
  const vector = new Float32Array(dimensions)
  const termFreq = new Map<string, number>()
  
  // Count term frequencies
  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1)
  }
  
  // Hash each token to multiple dimensions (multiple hash functions for better distribution)
  const numHashes = 3
  for (const [token, freq] of termFreq.entries()) {
    const tf = freq / tokens.length  // Term frequency normalized
    
    for (let h = 0; h < numHashes; h++) {
      const idx = Math.abs(simpleHash(token, h)) % dimensions
      // Use sign of hash to determine +/- (simulates signed feature hashing)
      const sign = (simpleHash(token, h + 1000) % 2) === 0 ? 1 : -1
      vector[idx] += sign * tf / numHashes
    }
  }
  
  // L2 normalization (important for cosine similarity)
  let norm = 0
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i]
  }
  norm = Math.sqrt(norm)
  
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm
    }
  }
  
  return vector
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
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
 * Convert embedding to base64 for storage/transmission
 */
export function embeddingToBase64(embedding: Float32Array): string {
  const buffer = new Uint8Array(embedding.buffer)
  return btoa(String.fromCharCode(...Array.from(buffer)))
}

/**
 * Convert base64 back to embedding
 */
export function embeddingFromBase64(base64: string): Float32Array {
  const binary = atob(base64)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i)
  }
  return new Float32Array(buffer.buffer)
}
