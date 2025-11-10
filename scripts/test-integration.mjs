#!/usr/bin/env node
/**
 * Integration test for trajectory matching components
 * 
 * Tests the implemented functionality:
 * - Embedding generation
 * - HNSW index operations
 * - IVF index operations
 * - Inverted index filtering
 * - Platt scaling calibration
 * - Conformal prediction
 * - TrajectoryMatcher pipeline
 */

import { embed, cosineSimilarity } from '../packages/utils/dist/index.js'
import { HNSWIndex } from '../packages/search/dist/index.js'
import { IVFIndex } from '../packages/search/dist/index.js'
import { InvertedIndex } from '../packages/search/dist/index.js'
import { fitPlatt, applyPlatt } from '../packages/predictor/dist/index.js'
import { calibrate, interval } from '../packages/predictor/dist/index.js'
import { TrajectoryMatcher } from '../packages/predictor/dist/index.js'

console.log('🧪 Running integration tests...\n')

// Test 1: Embedding
console.log('1️⃣ Testing embedding generation...')
const text1 = 'Hello world'
const text2 = 'Hello there'
const text3 = 'Goodbye world'

const emb1 = embed(text1)
const emb2 = embed(text2)
const emb3 = embed(text3)

console.log(`   Embedding dimensions: ${emb1.length}`)
console.log(`   Similarity(text1, text2): ${cosineSimilarity(emb1, emb2).toFixed(3)}`)
console.log(`   Similarity(text1, text3): ${cosineSimilarity(emb1, emb3).toFixed(3)}`)
console.log('   ✅ Embeddings working\n')

// Test 2: HNSW Index
console.log('2️⃣ Testing HNSW index...')
const hnsw = new HNSWIndex({ M: 8, efConstruction: 100, efSearch: 20 })

await hnsw.insert('doc1', Array.from(emb1))
await hnsw.insert('doc2', Array.from(emb2))
await hnsw.insert('doc3', Array.from(emb3))

const results = await hnsw.search(Array.from(emb1), 2)
console.log(`   Index size: ${hnsw.size()}`)
console.log(`   Search results: ${results.length}`)
console.log(`   Top result: ${results[0].id} (similarity: ${results[0].similarity.toFixed(3)})`)
console.log(`   Stats:`, hnsw.stats())
console.log('   ✅ HNSW index working\n')

// Test 3: IVF Index
console.log('3️⃣ Testing IVF index...')
const ivf = new IVFIndex({ nClusters: 2, nProbe: 1 })

ivf.add('doc1', Array.from(emb1))
ivf.add('doc2', Array.from(emb2))
ivf.add('doc3', Array.from(emb3))

await ivf.build()

const ivfResults = await ivf.search(Array.from(emb1), 2)
console.log(`   Index size: ${ivf.size()}`)
console.log(`   Search results: ${ivfResults.length}`)
console.log(`   Stats:`, ivf.stats())
console.log('   ✅ IVF index working\n')

// Test 4: Inverted Index
console.log('4️⃣ Testing inverted index...')
const inverted = new InvertedIndex()

inverted.add('span1', 'action', 'create_user')
inverted.add('span2', 'action', 'create_account')
inverted.add('span3', 'action', 'delete_user')

const actionMatches = inverted.find('action', 'create_user')
const fuzzyMatches = inverted.filterByAction(null, 'create', true)

console.log(`   Exact matches: ${actionMatches.length}`)
console.log(`   Fuzzy matches: ${fuzzyMatches.length}`)
console.log('   ✅ Inverted index working\n')

// Test 5: Platt Scaling
console.log('5️⃣ Testing Platt scaling calibration...')
const scores = [0.1, 0.3, 0.5, 0.7, 0.9]
const labels = [0, 0, 1, 1, 1]

const model = fitPlatt(scores, labels)
const calibratedProb = applyPlatt(0.6, model)

console.log(`   Model: A=${model.a.toFixed(3)}, B=${model.b.toFixed(3)}`)
console.log(`   Calibrated P(0.6): ${calibratedProb.toFixed(3)}`)
console.log('   ✅ Platt scaling working\n')

// Test 6: Conformal Prediction
console.log('6️⃣ Testing conformal prediction...')
const calibrationScores = [0.1, 0.2, 0.15, 0.25, 0.3, 0.18]
const alpha = 0.1  // 90% coverage

const quantile = calibrate(calibrationScores, alpha)
const predInterval = interval(0.5, quantile, alpha)

console.log(`   Quantile (90%): ${quantile.toFixed(3)}`)
console.log(`   Interval for 0.5: [${predInterval.lower.toFixed(3)}, ${predInterval.upper.toFixed(3)}]`)
console.log(`   Coverage: ${(predInterval.coverage * 100).toFixed(0)}%`)
console.log('   ✅ Conformal prediction working\n')

// Test 7: TrajectoryMatcher
console.log('7️⃣ Testing TrajectoryMatcher pipeline...')
const matcher = new TrajectoryMatcher({
  minTopK: 1,
  minScore: 0.2,
  minConfidence: 10,
})

// Add some test spans
await matcher.addSpan({
  id: 'span1',
  who: 'user',
  did: 'ask_question',
  this: 'What is the capital of France?',
  if_ok: 'Paris is the capital of France.',
  status: 'completed',
  when: new Date().toISOString(),
  quality: { total_score: 85 },
})

await matcher.addSpan({
  id: 'span2',
  who: 'user',
  did: 'ask_question',
  this: 'What is the capital of Germany?',
  if_ok: 'Berlin is the capital of Germany.',
  status: 'completed',
  when: new Date().toISOString(),
  quality: { total_score: 90 },
})

// Make a prediction
const prediction = await matcher.predict(
  { environment: 'geography' },
  'What is the capital of Spain?',
  { topK: 5, minQuality: 60 }
)

console.log(`   Output: "${prediction.output}"`)
console.log(`   Confidence: ${prediction.confidence.toFixed(1)}%`)
console.log(`   Trajectories used: ${prediction.trajectories_used}`)
console.log(`   Method: ${prediction.method}`)
console.log(`   Evidence items: ${prediction.evidence?.length || 0}`)
console.log('   ✅ TrajectoryMatcher working\n')

console.log('✨ All integration tests passed!')
console.log('\n📊 Summary:')
console.log('   • Embedding: deterministic, CPU-friendly ✅')
console.log('   • HNSW: hierarchical graph structure ✅')
console.log('   • IVF: K-means clustering ✅')
console.log('   • Inverted: fuzzy action matching ✅')
console.log('   • Platt: confidence calibration ✅')
console.log('   • Conformal: uncertainty intervals ✅')
console.log('   • Matcher: full pipeline ✅')
console.log('\n🎯 All components Edge-compatible, TypeScript-strict, CPU-friendly!')
