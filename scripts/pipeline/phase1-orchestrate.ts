#!/usr/bin/env node
/**
 * Phase 1: Orquestração Metalinguística
 *
 * - Transforma spans usando sistema de enzimas
 * - Aplica quality gates
 * - Gera diamonds+ (qualidade >= 85)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { ActivatedOrchestration } from '@arenalab/orchestration'
import type { CausalSpan } from '@arenalab/orchestration'
import type { Span } from '@arenalab/atomic'

/**
 * Main Phase 1 Pipeline
 */
async function runPhase1(inputPath: string, outputPath: string) {
  console.log('🚀 PHASE 1: ORQUESTRAÇÃO METALINGUÍSTICA\n')

  // Carregar spans enriquecidos
  console.log('📂 Carregando spans enriquecidos...')
  const enrichedSpans = loadEnrichedSpans(inputPath)
  console.log(`✅ ${enrichedSpans.length} spans carregados\n`)

  // Executar orquestração
  console.log('🧪 Executando pipeline de orquestração...')
  const transformedSpans = await runOrchestrationPipeline(
    enrichedSpans,
    1000 // batch size
  )
  console.log(`✅ ${transformedSpans.length} diamonds+ gerados\n`)

  // Gerar relatório de qualidade
  console.log('📊 Gerando relatório de qualidade...')
  const report = await generateQualityReport(enrichedSpans, transformedSpans)
  displayQualityReport(report)

  // Salvar resultados
  writeFileSync(
    outputPath,
    transformedSpans.map(s => JSON.stringify(s)).join('\n')
  )
  console.log(`\n💾 Diamonds+ salvos em: ${outputPath}`)

  // Salvar relatório
  writeFileSync(
    outputPath.replace('.ndjson', '.report.json'),
    JSON.stringify(report, null, 2)
  )

  console.log('\n✨ PHASE 1 COMPLETA!')
  return { transformedSpans, report }
}

/**
 * Carregar spans enriquecidos
 */
function loadEnrichedSpans(path: string): any[] {
  const content = readFileSync(path, 'utf-8')
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
}

/**
 * Executar pipeline de orquestração
 */
async function runOrchestrationPipeline(
  enrichedSpans: any[],
  batchSize: number = 1000
): Promise<any[]> {
  const orchestrator = new ActivatedOrchestration()
  const transformedSpans: any[] = []

  // Processar em lotes
  for (let i = 0; i < enrichedSpans.length; i += batchSize) {
    const batch = enrichedSpans.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(enrichedSpans.length / batchSize)

    console.log(`\n📦 Processando lote ${batchNum}/${totalBatches} (${batch.length} spans)`)

    for (const span of batch) {
      try {
        // Converter para CausalSpan
        const causalSpan = convertToCausalSpan(span)

        // Criar span orquestrado
        const orchestratedSpan = await orchestrator.createActivatedOrchestrationSpan(causalSpan)

        // Executar plano de transformação
        const result = await orchestrator.enzymeEngine.executeActivatedPlan(orchestratedSpan)

        // Filtrar por qualidade
        if (result.executionLog.quality_score >= 85) {
          transformedSpans.push(result.transformedSpan)
        }
      } catch (error: any) {
        console.error(`  ⚠️  Erro ao processar span ${span.id}:`, error.message)
      }
    }

    // Progress
    console.log(`  ✅ Lote completo. Diamonds+: ${transformedSpans.length}`)
  }

  return transformedSpans
}

/**
 * Converter span enriquecido para CausalSpan
 */
function convertToCausalSpan(enrichedSpan: any): CausalSpan {
  return {
    ...enrichedSpan,
    context: enrichedSpan.this,
    response: enrichedSpan.if_ok || '',
    thread_id: enrichedSpan.context?.thread_id,
    topic_id: enrichedSpan.context?.environment,
    enrichment: {
      intent: extractIntent(enrichedSpan.did),
      key_entities: enrichedSpan.semantic_tags || [],
      tags: enrichedSpan.semantic_tags || [],
      complexity: mapComplexity(enrichedSpan.complexity_score || 50),
      actionable: true
    },
    transformation_log: [],
    orchestration: undefined as any
  }
}

/**
 * Extrair intent da ação
 */
function extractIntent(action: string): string {
  const intentMap: Record<string, string> = {
    'ask_question': 'explain',
    'write_code': 'implement',
    'analyze_data': 'verify',
    'debug_code': 'debug',
    'optimize_code': 'optimize',
    'refactor_code': 'refactor'
  }
  return intentMap[action] || 'explain'
}

/**
 * Mapear score de complexidade para categoria
 */
function mapComplexity(score: number): 'low' | 'medium' | 'high' {
  if (score < 40) return 'low'
  if (score < 70) return 'medium'
  return 'high'
}

/**
 * Gerar relatório de qualidade
 */
async function generateQualityReport(
  original: any[],
  transformed: any[]
): Promise<QualityReport> {
  const report: QualityReport = {
    total_processed: original.length,
    diamonds_plus: 0,
    diamonds_original: 0,
    rejected: 0,
    avg_quality_improvement: 0,
    top_enzymes: []
  }

  const enzymeImpacts = new Map<string, number[]>()
  let totalImprovement = 0

  for (const span of transformed) {
    const finalQuality = span.transformation_log?.[0]?.quality_score || 0

    if (finalQuality >= 85) {
      report.diamonds_plus++
    } else if (finalQuality >= 80) {
      report.diamonds_original++
    } else {
      report.rejected++
    }

    // Calcular melhoria
    const originalQuality = span.metadata?.quality_score || 80
    const improvement = finalQuality - originalQuality
    totalImprovement += improvement

    // Rastrear impacto de enzimas
    const enzymeApps = span.transformation_log?.[0]?.enzyme_applications || []
    for (const app of enzymeApps) {
      if (!enzymeImpacts.has(app.enzyme)) {
        enzymeImpacts.set(app.enzyme, [])
      }
      enzymeImpacts.get(app.enzyme)!.push(app.metrics?.quality_impact || 0)
    }
  }

  report.avg_quality_improvement = totalImprovement / transformed.length

  // Calcular top enzimas
  report.top_enzymes = Array.from(enzymeImpacts.entries())
    .map(([enzyme, impacts]) => ({
      enzyme,
      avg_impact: impacts.reduce((a, b) => a + b, 0) / impacts.length,
      count: impacts.length
    }))
    .sort((a, b) => b.avg_impact - a.avg_impact)
    .slice(0, 10)

  return report
}

/**
 * Exibir relatório de qualidade
 */
function displayQualityReport(report: QualityReport) {
  console.log('\n📊 RELATÓRIO DE QUALIDADE')
  console.log('━'.repeat(60))
  console.log(`Total processado:      ${report.total_processed}`)
  console.log(`Diamonds+ (≥85):       ${report.diamonds_plus} (${((report.diamonds_plus/report.total_processed)*100).toFixed(1)}%)`)
  console.log(`Diamonds originais:    ${report.diamonds_original}`)
  console.log(`Rejeitados (<80):      ${report.rejected}`)
  console.log(`Melhoria média:        +${report.avg_quality_improvement.toFixed(2)} pontos`)

  console.log('\n🧬 TOP ENZIMAS POR IMPACTO')
  console.log('━'.repeat(60))
  report.top_enzymes.forEach((e, i) => {
    console.log(`${i+1}. ${e.enzyme.padEnd(25)} +${e.avg_impact.toFixed(2)} (${e.count}x)`)
  })
}

interface QualityReport {
  total_processed: number
  diamonds_plus: number
  diamonds_original: number
  rejected: number
  avg_quality_improvement: number
  top_enzymes: Array<{
    enzyme: string
    avg_impact: number
    count: number
  }>
}

// Executar se chamado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const inputPath = process.argv[2] || 'data/diamonds-enriched.ndjson'
  const outputPath = process.argv[3] || 'data/diamonds-plus.ndjson'

  runPhase1(inputPath, outputPath).catch(err => {
    console.error('❌ Erro:', err)
    process.exit(1)
  })
}

export { runPhase1 }
