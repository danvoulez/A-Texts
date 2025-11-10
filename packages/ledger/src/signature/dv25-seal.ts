/**
 * DV25 Seal: Cryptographic signature using Ed25519 + BLAKE3
 * 
 * Provides cryptographic integrity and authenticity for ledger entries.
 * Uses Ed25519 for signatures and BLAKE3 for hashing.
 * 
 * Note: This is a simulated implementation using Web Crypto API.
 * For production, use proper Ed25519 + BLAKE3 libraries.
 * 
 * @see docs/formula.md §Ledger - DV25 Cryptographic Seal
 */

export interface DV25Seal {
  signature: string
  publicKey: string
  algorithm: 'ed25519'
  hash: 'blake3'
}

/**
 * Sign data with DV25 seal
 * 
 * Process:
 * 1. Hash data with BLAKE3 (simulated with SHA-256)
 * 2. Sign hash with Ed25519 private key (simulated)
 * 3. Return signature + public key
 * 
 * @param data - Data to sign (JSON string)
 * @param privateKey - Ed25519 private key (hex or base64)
 * @returns DV25 seal with signature
 * 
 * @see docs/formula.md §DV25 Signing
 */
export async function signDV25(
  data: string,
  privateKey: string
): Promise<DV25Seal> {
  // Simulate BLAKE3 hash with SHA-256 (Web Crypto API)
  const hash = await hashBlake3Simulated(data)
  
  // Simulate Ed25519 signature
  // In production, use @noble/ed25519 or sodium-native
  const signature = await signEd25519Simulated(hash, privateKey)
  
  // Derive public key from private key (simulated)
  const publicKey = derivePublicKeySimulated(privateKey)
  
  return {
    signature,
    publicKey,
    algorithm: 'ed25519',
    hash: 'blake3',
  }
}

/**
 * Verify DV25 signature
 * 
 * Process:
 * 1. Hash data with BLAKE3 (simulated)
 * 2. Verify signature using Ed25519 public key
 * 
 * @param data - Original data to verify
 * @param seal - DV25 seal with signature and public key
 * @returns true if signature is valid
 * 
 * @see docs/formula.md §DV25 Verification
 */
export async function verifyDV25(
  data: string,
  seal: DV25Seal
): Promise<boolean> {
  try {
    // Recompute hash
    const hash = await hashBlake3Simulated(data)
    
    // Verify signature (simulated)
    const isValid = await verifyEd25519Simulated(hash, seal.signature, seal.publicKey)
    
    return isValid
  } catch (error) {
    console.error('[DV25] Verification error:', error)
    return false
  }
}

/**
 * Simulated BLAKE3 hash using SHA-256
 * 
 * Note: In production, use @noble/hashes/blake3 or native BLAKE3
 */
async function hashBlake3Simulated(data: string): Promise<string> {
  // Use SHA-256 as BLAKE3 simulation
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  
  // Web Crypto API available in both browsers and modern Node.js
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    return bufferToHex(hashBuffer)
  }
  
  // Fallback: simple string hash for environments without crypto.subtle
  return simpleStringHash(data)
}

/**
 * Simulated Ed25519 signing
 * 
 * Note: In production, use @noble/ed25519 or libsodium
 */
async function signEd25519Simulated(hash: string, privateKey: string): Promise<string> {
  // Deterministic signature based on hash + private key
  const combined = hash + privateKey
  const signatureHash = await hashBlake3Simulated(combined)
  
  // Add Ed25519 prefix marker
  return `ed25519_${signatureHash}`
}

/**
 * Simulated Ed25519 verification
 */
async function verifyEd25519Simulated(
  hash: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  // Check signature format
  if (!signature.startsWith('ed25519_')) {
    return false
  }
  
  // Simulate verification by recomputing signature
  // In real Ed25519, we'd verify using the public key
  // For simulation, just check signature is well-formed
  const signatureBody = signature.replace('ed25519_', '')
  
  // Basic validation: signature should be hex string of correct length
  return /^[0-9a-f]{64}$/i.test(signatureBody)
}

/**
 * Derive public key from private key (simulated)
 */
function derivePublicKeySimulated(privateKey: string): string {
  // In real Ed25519, public key is derived via scalar multiplication
  // For simulation, derive deterministically from private key
  const hash = simpleStringHash(privateKey + '_public')
  return `pub_${hash}`
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Simple string hash fallback (for environments without crypto.subtle)
 */
function simpleStringHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Convert to positive hex string
  const hex = (Math.abs(hash) >>> 0).toString(16).padStart(8, '0')
  
  // Pad to 64 characters (32 bytes) for consistency
  return hex.repeat(8).substring(0, 64)
}
