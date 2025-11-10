#!/usr/bin/env node
/**
 * Parse Spans Script
 * 
 * Demonstrates usage of the span parser with examples
 */

import { SpanParser } from '../packages/utils/src/span-parser.js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Load sample NDJSON file
 */
function loadSampleFile(): string {
  const samplePath = path.join(__dirname, '../data/examples/spans.sample.ndjson')
  return fs.readFileSync(samplePath, 'utf-8')
}

/**
 * Example 1: Basic parsing with validation
 */
async function example1() {
  console.log('\n📋 Example 1: Basic Parsing\n')
  
  const parser = new SpanParser({
    validateSchema: true,
    validateSignature: false
  })
  
  const content = loadSampleFile()
  const result = await parser.parse(content)
  
  console.log(`Total lines:     ${result.stats.total}`)
  console.log(`Valid spans:     ${result.stats.valid}`)
  console.log(`Invalid spans:   ${result.stats.invalid}`)
  console.log(`Parse errors:    ${result.stats.parseErrors}`)
  console.log(`Validation errs: ${result.stats.validationErrors}`)
  
  if (result.spans.length > 0) {
    console.log('\n✅ First valid span:')
    console.log(JSON.stringify(result.spans[0], null, 2))
  }
  
  if (result.invalid.length > 0) {
    console.log('\n❌ First invalid span:')
    console.log(`Line ${result.invalid[0].line}: ${result.invalid[0].errors.join(', ')}`)
  }
}

/**
 * Example 2: Filtering spans
 */
async function example2() {
  console.log('\n📋 Example 2: Filtering by Status\n')
  
  const parser = new SpanParser({
    validateSchema: true,
    filters: {
      status: 'completed'
    }
  })
  
  const content = loadSampleFile()
  const result = await parser.parse(content)
  
  console.log(`Total lines:     ${result.stats.total}`)
  console.log(`Valid spans:     ${result.stats.valid}`)
  console.log(`Filtered out:    ${result.stats.filtered}`)
  
  console.log('\n✅ Completed spans:')
  result.spans.forEach((span, i) => {
    console.log(`  ${i + 1}. ${span.who} ${span.did} ${span.this.substring(0, 40)}...`)
  })
}

/**
 * Example 3: Domain filtering
 */
async function example3() {
  console.log('\n📋 Example 3: Filtering by Domain\n')
  
  const parser = new SpanParser({
    validateSchema: true,
    filters: {
      domain: 'programming'
    }
  })
  
  const content = loadSampleFile()
  const result = await parser.parse(content)
  
  console.log(`Total lines:     ${result.stats.total}`)
  console.log(`Valid spans:     ${result.stats.valid}`)
  console.log(`Filtered out:    ${result.stats.filtered}`)
  
  console.log('\n💻 Programming-related spans:')
  result.spans.forEach((span, i) => {
    console.log(`  ${i + 1}. ${span.did}: ${span.this.substring(0, 50)}...`)
    if (span.if_ok) {
      console.log(`     → ${span.if_ok.substring(0, 60)}...`)
    }
  })
}

/**
 * Example 4: Quality filtering
 */
async function example4() {
  console.log('\n📋 Example 4: Filtering by Quality Score\n')
  
  const parser = new SpanParser({
    validateSchema: true,
    filters: {
      minQuality: 90
    }
  })
  
  const content = loadSampleFile()
  const result = await parser.parse(content)
  
  console.log(`Total lines:     ${result.stats.total}`)
  console.log(`Valid spans:     ${result.stats.valid}`)
  console.log(`Filtered out:    ${result.stats.filtered}`)
  
  console.log('\n💎 High-quality spans (score ≥ 90):')
  result.spans.forEach((span, i) => {
    const score = span.metadata?.quality_score || 0
    console.log(`  ${i + 1}. [${score}] ${span.did}: ${span.this.substring(0, 40)}...`)
  })
}

/**
 * Example 5: Error reporting
 */
async function example5() {
  console.log('\n📋 Example 5: Error Analysis\n')
  
  // Create some invalid data
  const invalidContent = `
{"id":"valid_1","who":"user","did":"test","this":"data","when":"2025-01-10T10:00:00Z","status":"completed"}
{"invalid json here
{"id":"missing_fields","who":"user"}
{"id":"bad_status","who":"user","did":"test","this":"data","when":"2025-01-10T10:00:00Z","status":"invalid_status"}
  `.trim()
  
  const parser = new SpanParser({
    validateSchema: true,
    readerOptions: {
      continueOnError: true
    }
  })
  
  const result = await parser.parse(invalidContent)
  
  console.log(`Total lines:     ${result.stats.total}`)
  console.log(`Valid spans:     ${result.stats.valid}`)
  console.log(`Invalid spans:   ${result.stats.invalid}`)
  console.log(`Parse errors:    ${result.stats.parseErrors}`)
  console.log(`Validation errs: ${result.stats.validationErrors}`)
  
  console.log('\n❌ Error Breakdown:')
  for (const [reason, count] of result.stats.errorReasons.entries()) {
    console.log(`  ${count}x: ${reason}`)
  }
  
  console.log('\n📝 Invalid Spans Details:')
  result.invalid.forEach((inv, i) => {
    console.log(`  ${i + 1}. Line ${inv.line}:`)
    inv.errors.forEach(err => console.log(`     - ${err}`))
  })
}

/**
 * Example 6: Progress tracking
 */
async function example6() {
  console.log('\n📋 Example 6: Progress Tracking\n')
  
  const parser = new SpanParser({
    validateSchema: true,
    readerOptions: {
      progressInterval: 1, // Report every line for demo
      onProgress: (progress) => {
        process.stdout.write(`\r  Lines: ${progress.linesRead}, Errors: ${progress.errors}`)
      }
    }
  })
  
  const content = loadSampleFile()
  const result = await parser.parse(content)
  
  console.log('\n\n✅ Parsing complete!')
  console.log(`  Total: ${result.stats.total}`)
  console.log(`  Valid: ${result.stats.valid}`)
}

/**
 * Main
 */
async function main() {
  console.log('🔍 Span Parser Examples')
  console.log('=' .repeat(50))
  
  try {
    await example1()
    await example2()
    await example3()
    await example4()
    await example5()
    await example6()
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ All examples completed successfully!')
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
