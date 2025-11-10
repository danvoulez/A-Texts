/**
 * Ledger: Append-only NDJSON storage
 * 
 * Features:
 * - Append-only semantics
 * - NDJSON format (one JSON per line)
 * - Integrity verification
 * - DV25 cryptographic seals
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
  
  // TODO: Actual file append (depends on runtime - Node.js vs Edge)
  // For now, log it
  console.log('[Ledger] Append:', line)
}

/**
 * Hash span for integrity
 */
async function hashSpan(span: Span): Promise<string> {
  const content = JSON.stringify(span)
  
  // TODO: Implement BLAKE3 hashing
  // For now, use simple string hash
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return Math.abs(hash).toString(16)
}

/**
 * Verify ledger integrity
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
 * Read entries from ledger
 */
export function parseLedgerEntries(ndjson: string): LedgerEntry[] {
  return ndjson
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
}
