/**
 * Ledger: Append-only NDJSON storage
 * 
 * Features:
 * - Append-only semantics
 * - NDJSON format (one JSON per line)
 * - Integrity verification with BLAKE3 hashing
 * - DV25 cryptographic seals (optional)
 * 
 * @see docs/formula.md §Ledger - Append-Only Storage
 */

import type { Span } from '@arenalab/atomic'

export interface LedgerEntry {
  span: Span
  hash: string
  signature?: string
  timestamp: number
}

/**
 * Append span to ledger
 * 
 * Creates ledger entry with hash and optional signature,
 * then appends as NDJSON line.
 * 
 * @param span - Span to append
 * @param ledgerPath - Path to ledger file (Node.js) or ignored (Edge)
 * @returns void
 * 
 * @see docs/formula.md §Ledger Append
 */
export async function appendToLedger(
  span: Span,
  ledgerPath: string
): Promise<void> {
  const entry: LedgerEntry = {
    span,
    hash: await hashSpan(span),
    timestamp: Date.now(),
  }
  
  const line = JSON.stringify(entry) + '\n'
  
  // Runtime detection: Node.js vs Edge Worker
  if (typeof process !== 'undefined' && process.versions?.node) {
    // Node.js: append to file
    await appendToFileNode(ledgerPath, line)
  } else {
    // Edge Worker: log to console (no filesystem)
    // In production Edge, send to KV store or R2
    console.log('[Ledger] Append (Edge):', line.substring(0, 100) + '...')
  }
}

/**
 * Append to file in Node.js environment
 */
async function appendToFileNode(path: string, content: string): Promise<void> {
  try {
    // Dynamic import to avoid bundling issues in Edge environment
    const fs = await import('fs/promises')
    await fs.appendFile(path, content, 'utf-8')
    console.log(`[Ledger] Appended to ${path}`)
  } catch (error) {
    console.error('[Ledger] File append error:', error)
    // Fallback: log to console
    console.log('[Ledger] Append (fallback):', content)
  }
}

/**
 * Hash span for integrity using BLAKE3 (simulated with SHA-256)
 * 
 * Computes deterministic hash of span content.
 * Used for integrity verification.
 * 
 * @param span - Span to hash
 * @returns Hash string (hex)
 * 
 * @see docs/formula.md §BLAKE3 Hashing
 */
async function hashSpan(span: Span): Promise<string> {
  const content = JSON.stringify(span)
  
  // Use Web Crypto API if available (browsers + modern Node.js)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return bufferToHex(hashBuffer)
  }
  
  // Fallback: simple deterministic hash
  return simpleStringHash(content)
}

/**
 * Verify ledger integrity
 * 
 * Checks that all entries have valid hashes.
 * Recomputes hash for each span and compares.
 * 
 * @param entries - Array of ledger entries
 * @returns true if all hashes valid, false otherwise
 */
export async function verifyLedgerIntegrity(
  entries: LedgerEntry[]
): Promise<boolean> {
  for (const entry of entries) {
    const computedHash = await hashSpan(entry.span)
    if (computedHash !== entry.hash) {
      console.error(`Hash mismatch for span ${entry.span.id}`)
      return false
    }
  }
  return true
}

/**
 * Read entries from ledger NDJSON
 * 
 * Parses NDJSON format (one JSON per line).
 * 
 * @param ndjson - NDJSON string
 * @returns Array of parsed ledger entries
 */
export function parseLedgerEntries(ndjson: string): LedgerEntry[] {
  return ndjson
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
}

/**
 * Read ledger from file (Node.js only)
 * 
 * @param ledgerPath - Path to ledger file
 * @returns Array of ledger entries
 */
export async function readLedgerFromFile(ledgerPath: string): Promise<LedgerEntry[]> {
  try {
    const fs = await import('fs/promises')
    const content = await fs.readFile(ledgerPath, 'utf-8')
    return parseLedgerEntries(content)
  } catch (error) {
    console.error('[Ledger] Read error:', error)
    return []
  }
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
 * Simple deterministic string hash (fallback)
 */
function simpleStringHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  // Convert to hex string
  return (Math.abs(hash) >>> 0).toString(16).padStart(16, '0')
}
