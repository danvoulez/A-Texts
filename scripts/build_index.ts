/**
 * Build Index script: Construct search indices from spans
 * 
 * Builds:
 * - Vector index (HNSW/IVF) from span embeddings
 * - Inverted index (action, domain, quality)
 * - Temporal index (time-based)
 */

import { readFileSync } from 'fs'

interface Span {
  id: string
  who: string
  did: string
  this: string
  when: string
  status: string
  if_ok?: string
  context?: any
  metadata?: any
}

async function buildIndex() {
  console.log('🔨 Building indices from spans...')
  
  // Read spans from NDJSON
  const ndjson = readFileSync('data/examples/spans.sample.ndjson', 'utf-8')
  const spans: Span[] = ndjson
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
  
  console.log(`📊 Loaded ${spans.length} spans`)
  
  // Build inverted index by action
  const byAction = new Map<string, string[]>()
  for (const span of spans) {
    if (!byAction.has(span.did)) {
      byAction.set(span.did, [])
    }
    byAction.get(span.did)!.push(span.id)
  }
  
  console.log(`📇 Action index: ${byAction.size} unique actions`)
  
  // Build inverted index by domain
  const byDomain = new Map<string, string[]>()
  for (const span of spans) {
    const domain = span.context?.environment || 'general'
    if (!byDomain.has(domain)) {
      byDomain.set(domain, [])
    }
    byDomain.get(domain)!.push(span.id)
  }
  
  console.log(`🏷️  Domain index: ${byDomain.size} unique domains`)
  
  // Build quality bucket index
  const byQuality = new Map<number, string[]>()
  for (const span of spans) {
    const quality = span.metadata?.quality_score || 0
    const bucket = Math.floor(quality / 10) * 10
    if (!byQuality.has(bucket)) {
      byQuality.set(bucket, [])
    }
    byQuality.get(bucket)!.push(span.id)
  }
  
  console.log(`⭐ Quality index: ${byQuality.size} quality buckets`)
  
  // TODO: Build vector index (HNSW/IVF)
  // This requires embedding model integration
  console.log('⏳ Vector index: TODO (requires embedding model)')
  
  console.log('✅ Index building complete')
}

buildIndex().catch(console.error)
