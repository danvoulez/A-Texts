#!/usr/bin/env node
/**
 * Phase 0: Preparação dos Dados
 *
 * - Validação dos 350k spans diamante
 * - Enriquecimento semântico inicial
 * - Construção de índices iniciais
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { SpanParser } from '@arenalab/utils'
import { embed } from '@arenalab/utils'
import { HNSWIndex, InvertedIndex } from '@arenalab/search'
import type { Span } from '@arenalab/atomic'

interface EnrichedSpan extends Span {
  embeddings?: {
    query_embedding: number[]
    response_embedding: number[]
    combined_embedding: number[]
  }
  semantic_tags?: string[]
  complexity_score?: number
}

/**
 * Main Phase 0 Pipeline
 */
async function runPhase0(inputPath: string, outputPath: string) {
  console.log('🚀 PHASE 0: PREPARAÇÃO DOS DADOS\n')

  // Step 1: Validar spans
  console.log('📋 Step 1/3: Validando spans diamante...')
  const validSpans = await validateDiamonds(inputPath)
  console.log(`✅ ${validSpans.length} spans válidos\n`)

  // Step 2: Enriquecer semanticamente
  console.log('🧬 Step 2/3: Enriquecendo spans com embeddings...')
  const enrichedSpans = await enrichSpans(validSpans)
  console.log(`✅ ${enrichedSpans.length} spans enriquecidos\n`)

  // Step 3: Construir índices
  console.log('🏗️  Step 3/3: Construindo índices iniciais...')
  const indices = await buildInitialIndices(enrichedSpans)
  console.log(`✅ Índices construídos\n`)

  // Salvar resultados
  writeFileSync(
    outputPath,
    enrichedSpans.map(s => JSON.stringify(s)).join('\n')
  )
  console.log(`💾 Spans enriquecidos salvos em: ${outputPath}`)

  // Salvar índices
  writeFileSync(
    outputPath.replace('.ndjson', '.hnsw.json'),
    JSON.stringify({
      type: 'hnsw',
      stats: indices.hnsw.stats(),
      timestamp: new Date().toISOString()
    })
  )

  console.log('\n✨ PHASE 0 COMPLETA!')
  return { enrichedSpans, indices }
}

/**
 * Validar spans diamante
 */
async function validateDiamonds(inputPath: string): Promise<Span[]> {
  const content = readFileSync(inputPath, 'utf-8')

  const parser = new SpanParser({
    validateSchema: true,
    validateSignature: false,
    filters: {
      minQuality: 80  // Apenas diamantes reais
    }
  })

  const result = await parser.parse(content)

  console.log(`  📊 Estatísticas:`)
  console.log(`    - Total: ${result.stats.total}`)
  console.log(`    - Válidos: ${result.stats.valid}`)
  console.log(`    - Inválidos: ${result.stats.invalid}`)
  console.log(`    - Filtrados: ${result.stats.filtered}`)

  // Análise de distribuição
  const distribution = analyzeDistribution(result.spans)
  console.log(`  📈 Distribuição:`)
  console.log(`    - Domínios únicos: ${distribution.domains}`)
  console.log(`    - Ações únicas: ${distribution.actions}`)
  console.log(`    - Qualidade média: ${distribution.avgQuality}`)

  return result.spans
}

/**
 * Analisar distribuição de spans
 */
function analyzeDistribution(spans: Span[]) {
  const domains = new Set<string>()
  const actions = new Set<string>()
  let totalQuality = 0

  for (const span of spans) {
    if (span.context?.environment) domains.add(span.context.environment)
    actions.add(span.did)
    totalQuality += span.metadata?.quality_score || 0
  }

  return {
    domains: domains.size,
    actions: actions.size,
    avgQuality: (totalQuality / spans.length).toFixed(2)
  }
}

/**
 * Enriquecer spans com embeddings e metadados
 */
async function enrichSpans(spans: Span[]): Promise<EnrichedSpan[]> {
  const enriched: EnrichedSpan[] = []
  const batchSize = 100

  for (let i = 0; i < spans.length; i += batchSize) {
    const batch = spans.slice(i, i + batchSize)

    for (const span of batch) {
      const query = span.this
      const response = span.if_ok || ''

      // Gerar embeddings
      const queryEmb = await embed(query)
      const responseEmb = await embed(response)
      const combinedEmb = await embed(`${query}\n\n${response}`)

      // Extrair tags semânticas
      const semanticTags = extractSemanticTags(query, response)

      // Calcular complexidade
      const complexityScore = calculateComplexity(query, response)

      enriched.push({
        ...span,
        embeddings: {
          query_embedding: queryEmb,
          response_embedding: responseEmb,
          combined_embedding: combinedEmb
        },
        semantic_tags: semanticTags,
        complexity_score: complexityScore
      })
    }

    // Progress
    if ((i / batchSize) % 10 === 0) {
      console.log(`  ⏳ Progresso: ${i}/${spans.length} (${((i/spans.length)*100).toFixed(1)}%)`)
    }
  }

  return enriched
}

/**
 * Extrair tags semânticas
 */
function extractSemanticTags(query: string, response: string): string[] {
  const tags = new Set<string>()
  const text = (query + ' ' + response).toLowerCase()

  // Detectar domínio
  if (/code|function|program|implement/.test(text)) tags.add('programming')
  if (/explain|what|why|how/.test(text)) tags.add('explanation')
  if (/analyze|summarize|evaluate/.test(text)) tags.add('analysis')
  if (/debug|error|fix|issue/.test(text)) tags.add('debugging')
  if (/optimize|performance|improve/.test(text)) tags.add('optimization')
  if (/security|auth|token|password/.test(text)) tags.add('security')

  // Detectar linguagens de programação
  if (/javascript|typescript|node/.test(text)) tags.add('javascript')
  if (/python|django|flask/.test(text)) tags.add('python')
  if (/rust|cargo/.test(text)) tags.add('rust')
  if (/sql|database|query/.test(text)) tags.add('database')

  return Array.from(tags)
}

/**
 * Calcular score de complexidade
 */
function calculateComplexity(query: string, response: string): number {
  // Fatores de complexidade:
  // 1. Tamanho da resposta
  const lengthScore = Math.min(100, response.length / 10)

  // 2. Presença de código
  const codeScore = /```|function|class|def |import /.test(response) ? 20 : 0

  // 3. Estrutura (linhas, bullets, etc)
  const structureScore = (response.match(/\n/g) || []).length * 2

  // 4. Vocabulário técnico
  const technicalWords = ['implement', 'algorithm', 'optimize', 'analyze', 'architecture']
  const techScore = technicalWords.filter(w => response.toLowerCase().includes(w)).length * 5

  return Math.min(100, lengthScore + codeScore + structureScore + techScore)
}

/**
 * Construir índices iniciais
 */
async function buildInitialIndices(enrichedSpans: EnrichedSpan[]) {
  // Índice vetorial HNSW para busca semântica
  const hnsw = new HNSWIndex({
    M: 16,              // Conexões por nó
    efConstruction: 200, // Qualidade de construção
    distanceType: 'cosine'
  })

  // Índice invertido para filtros rápidos
  const inverted = new InvertedIndex()

  // Indexar todos os spans
  for (const span of enrichedSpans) {
    // Adicionar ao HNSW
    if (span.embeddings?.combined_embedding) {
      await hnsw.add(span.id, span.embeddings.combined_embedding)
    }

    // Adicionar ao índice invertido
    inverted.add(span)
  }

  // Estatísticas
  const hnswStats = hnsw.stats()
  console.log(`  📊 HNSW:`)
  console.log(`    - Nós: ${hnswStats.nodes}`)
  console.log(`    - Camadas: ${hnswStats.layers}`)
  console.log(`    - Conexões médias: ${hnswStats.avgConnections?.toFixed(2) || 'N/A'}`)

  return { hnsw, inverted }
}

// Executar se chamado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const inputPath = process.argv[2] || 'data/diamonds.ndjson'
  const outputPath = process.argv[3] || 'data/diamonds-enriched.ndjson'

  runPhase0(inputPath, outputPath).catch(err => {
    console.error('❌ Erro:', err)
    process.exit(1)
  })
}

export { runPhase0 }
