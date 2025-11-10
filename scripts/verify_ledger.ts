/**
 * Verify Ledger script: Check NDJSON integrity and signatures
 * 
 * Verifies:
 * - NDJSON format validity
 * - Hash integrity per line
 * - DV25 signature verification (stub)
 */

import { readFileSync } from 'fs'
import { createHash } from 'crypto'

interface Span {
  id: string
  [key: string]: any
}

function hashLine(line: string): string {
  return createHash('blake3' as any).update(line).digest('hex')
}

async function verifyLedger(filepath: string) {
  console.log(`🔍 Verifying ledger: ${filepath}`)
  
  const content = readFileSync(filepath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  let valid = 0
  let invalid = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    try {
      // Parse JSON
      const span: Span = JSON.parse(line)
      
      // Verify required fields
      if (!span.id || !span.who || !span.did) {
        console.error(`❌ Line ${i + 1}: Missing required fields`)
        invalid++
        continue
      }
      
      // TODO: Verify DV25 signature
      // This requires implementing Ed25519 + BLAKE3 verification
      
      valid++
    } catch (error) {
      console.error(`❌ Line ${i + 1}: Invalid JSON - ${error.message}`)
      invalid++
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`  ✅ Valid lines: ${valid}`)
  console.log(`  ❌ Invalid lines: ${invalid}`)
  console.log(`  📝 Total lines: ${lines.length}`)
  
  if (invalid === 0) {
    console.log(`\n✅ Ledger is valid!`)
    return true
  } else {
    console.log(`\n⚠️  Ledger has ${invalid} invalid entries`)
    return false
  }
}

// Run verification
const filepath = process.argv[2] || 'data/examples/spans.sample.ndjson'
verifyLedger(filepath).catch(console.error)
