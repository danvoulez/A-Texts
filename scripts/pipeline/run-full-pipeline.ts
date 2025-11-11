#!/usr/bin/env node
/**
 * Pipeline Master Runner
 *
 * Executa todo o pipeline de treino LogLine LLM:
 * - Phase 0: Preparação dos dados
 * - Phase 1: Orquestração metalinguística
 * - (Fases 2-5 podem ser adicionadas posteriormente)
 */

import { runPhase0 } from './phase0-prepare.js'
import { runPhase1 } from './phase1-orchestrate.js'
import { writeFileSync } from 'node:fs'

interface PipelineConfig {
  inputPath: string
  outputDir: string
  phases: {
    phase0: boolean
    phase1: boolean
    phase2?: boolean
    phase3?: boolean
    phase4?: boolean
    phase5?: boolean
  }
}

/**
 * Executar pipeline completo
 */
async function runFullPipeline(config: PipelineConfig) {
  console.log('🚀 LOGLINE LLM TRAINING PIPELINE')
  console.log('━'.repeat(70))
  console.log(`Input: ${config.inputPath}`)
  console.log(`Output Dir: ${config.outputDir}`)
  console.log('━'.repeat(70))
  console.log('')

  const startTime = Date.now()
  const results: any = {}

  try {
    // Phase 0: Preparação
    if (config.phases.phase0) {
      console.log('\n' + '═'.repeat(70))
      console.log('PHASE 0: PREPARAÇÃO DOS DADOS')
      console.log('═'.repeat(70))

      const phase0Output = `${config.outputDir}/diamonds-enriched.ndjson`
      const phase0Result = await runPhase0(config.inputPath, phase0Output)
      results.phase0 = {
        success: true,
        spans_count: phase0Result.enrichedSpans.length,
        output_path: phase0Output
      }
    }

    // Phase 1: Orquestração
    if (config.phases.phase1) {
      console.log('\n' + '═'.repeat(70))
      console.log('PHASE 1: ORQUESTRAÇÃO METALINGUÍSTICA')
      console.log('═'.repeat(70))

      const phase1Input = results.phase0?.output_path || `${config.outputDir}/diamonds-enriched.ndjson`
      const phase1Output = `${config.outputDir}/diamonds-plus.ndjson`
      const phase1Result = await runPhase1(phase1Input, phase1Output)
      results.phase1 = {
        success: true,
        spans_count: phase1Result.transformedSpans.length,
        output_path: phase1Output,
        quality_improvement: phase1Result.report.avg_quality_improvement
      }
    }

    // TODO: Adicionar fases 2-5

    // Resumo final
    const duration = Date.now() - startTime
    displayFinalSummary(results, duration)

    // Salvar resumo
    writeFileSync(
      `${config.outputDir}/pipeline-summary.json`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        config,
        results
      }, null, 2)
    )

    console.log(`\n💾 Resumo salvo em: ${config.outputDir}/pipeline-summary.json`)

  } catch (error: any) {
    console.error('\n❌ ERRO NO PIPELINE:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

/**
 * Exibir resumo final
 */
function displayFinalSummary(results: any, duration: number) {
  console.log('\n' + '═'.repeat(70))
  console.log('🎉 PIPELINE COMPLETO!')
  console.log('═'.repeat(70))

  if (results.phase0) {
    console.log(`\n✅ Phase 0: ${results.phase0.spans_count} spans enriquecidos`)
  }

  if (results.phase1) {
    console.log(`✅ Phase 1: ${results.phase1.spans_count} diamonds+ gerados`)
    console.log(`   Melhoria de qualidade: +${results.phase1.quality_improvement.toFixed(2)} pontos`)
  }

  console.log(`\n⏱️  Tempo total: ${(duration / 1000).toFixed(2)}s`)
  console.log('═'.repeat(70))
}

/**
 * Parse argumentos CLI
 */
function parseArgs(): PipelineConfig {
  const args = process.argv.slice(2)

  const config: PipelineConfig = {
    inputPath: 'data/diamonds.ndjson',
    outputDir: 'data/pipeline-output',
    phases: {
      phase0: true,
      phase1: true
    }
  }

  // Parse flags
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--input' || arg === '-i') {
      config.inputPath = args[++i]
    } else if (arg === '--output' || arg === '-o') {
      config.outputDir = args[++i]
    } else if (arg === '--skip-phase0') {
      config.phases.phase0 = false
    } else if (arg === '--skip-phase1') {
      config.phases.phase1 = false
    } else if (arg === '--help' || arg === '-h') {
      displayHelp()
      process.exit(0)
    }
  }

  return config
}

/**
 * Exibir ajuda
 */
function displayHelp() {
  console.log(`
🚀 LogLine LLM Training Pipeline

USAGE:
  node scripts/pipeline/run-full-pipeline.js [OPTIONS]

OPTIONS:
  -i, --input <path>      Caminho do arquivo de entrada (NDJSON)
                          Default: data/diamonds.ndjson

  -o, --output <dir>      Diretório de saída
                          Default: data/pipeline-output

  --skip-phase0           Pular Phase 0 (preparação)
  --skip-phase1           Pular Phase 1 (orquestração)

  -h, --help              Mostrar esta ajuda

EXAMPLES:
  # Executar pipeline completo
  node scripts/pipeline/run-full-pipeline.js

  # Usar arquivo customizado
  node scripts/pipeline/run-full-pipeline.js -i data/my-diamonds.ndjson

  # Pular preparação (usar dados já enriquecidos)
  node scripts/pipeline/run-full-pipeline.js --skip-phase0
`)
}

// Executar se chamado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const config = parseArgs()
  runFullPipeline(config).catch(err => {
    console.error('❌ Erro fatal:', err)
    process.exit(1)
  })
}

export { runFullPipeline }
