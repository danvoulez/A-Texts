/**
 * @arenalab/orchestration/activation-engine
 *
 * Motor de Ativação Estratégica de Campos Latentes
 *
 * Implementa sistema de enzimas para transformação e enriquecimento de spans
 * usando análise semântica, otimização de sintaxe, e preservação de contexto.
 *
 * Baseado na orquestração metalinguística para LogLine LLM Training Pipeline.
 */

import { createHash } from 'node:crypto'
import type {
  CausalSpan,
  OrchestrationSpan,
  QualityScore,
  ActivatedTransformationLog,
  EnzymeApplication,
  EnzymeParameters,
  StepMetrics,
  ChangeLog,
  TransformationMetrics,
  ContextUsage,
  ActivatedExecutionStep
} from './types.js'

/**
 * Buffer de Contexto Dinâmico
 *
 * Mantém histórico de spans por thread para preservação de contexto
 */
export class DynamicContextBuffer {
  private buffer: Map<string, CausalSpan[]> = new Map()
  private maxWindowSize = 5

  addToThread(thread_id: string, span: CausalSpan) {
    if (!this.buffer.has(thread_id)) this.buffer.set(thread_id, [])
    const threadSpans = this.buffer.get(thread_id)!
    threadSpans.push(span)
    if (threadSpans.length > this.maxWindowSize) threadSpans.shift()
  }

  getThreadContext(thread_id: string, max_spans: number = 3): CausalSpan[] {
    const spans = this.buffer.get(thread_id) || []
    return spans.slice(-max_spans)
  }

  getRelevantContext(span: CausalSpan, similarity_threshold: number = 0.7): CausalSpan[] {
    if (!span.thread_id) return []
    const threadSpans = this.getThreadContext(span.thread_id)
    return threadSpans.filter(s => this.calculateSimilarity(span, s) >= similarity_threshold)
  }

  private calculateSimilarity(a: CausalSpan, b: CausalSpan): number {
    const tagsA = a.enrichment?.tags || []
    const tagsB = b.enrichment?.tags || []
    const commonTags = tagsA.filter(t => tagsB.includes(t))

    const entitiesA = a.enrichment?.key_entities || []
    const entitiesB = b.enrichment?.key_entities || []
    const commonEntities = entitiesA.filter(e => entitiesB.includes(e))

    const tagSim = (commonTags.length / Math.max(tagsA.length, tagsB.length)) || 0
    const entSim = (commonEntities.length / Math.max(entitiesA.length, entitiesB.length)) || 0
    const topicSim = a.topic_id && b.topic_id && a.topic_id === b.topic_id ? 1 : 0

    return (tagSim + entSim + topicSim) / 3
  }
}

/**
 * Avaliador Empírico de Qualidade
 *
 * Implementa o 5D Quality Meter para avaliação de spans
 */
export class EmpiricalQualityEvaluator {
  async evaluateSpan(span: CausalSpan): Promise<QualityScore> {
    const scores = await Promise.all([
      this.assessClarity(span),
      this.assessCoherence(span),
      this.assessDepth(span),
      this.assessActionability(span),
      this.assessNovelty(span),
      this.assessFactualAccuracy(span)
    ])

    const weights = [0.20, 0.15, 0.15, 0.20, 0.15, 0.15]
    const weighted = scores.reduce((acc, s, i) => acc + s * weights[i], 0)

    return {
      overall: Math.round(weighted),
      clarity: scores[0],
      coherence: scores[1],
      depth: scores[2],
      actionability: scores[3],
      novelty: scores[4],
      accuracy: scores[5],
      evaluated_at: new Date().toISOString()
    }
  }

  private async assessClarity(span: CausalSpan): Promise<number> {
    const f = [
      span.response.length > 100 ? 1 : 0.5,
      (span.response.includes('\n') || span.response.includes('-')) ? 1 : 0.3,
      (/[.!?]/.test(span.response) ? 1 : 0.5),
      this.hasClearStructure(span.response) ? 1 : 0.5
    ]
    return (f.reduce((a, b) => a + b, 0) / f.length) * 100
  }

  private async assessCoherence(span: CausalSpan): Promise<number> {
    const sentences = span.response.split(/[.!?]+/).filter(s => s.trim().length > 10)
    if (sentences.length < 2) return 70
    const transitions = ['however', 'therefore', 'furthermore', 'additionally', 'consequently']
    const hasTransitions = transitions.some(w => span.response.toLowerCase().includes(w))
    return hasTransitions ? 85 : 75
  }

  private async assessDepth(span: CausalSpan): Promise<number> {
    const c = span.enrichment?.complexity || 'medium'
    return c === 'high' ? 90 : c === 'low' ? 70 : 80
  }

  private async assessActionability(span: CausalSpan): Promise<number> {
    return span.enrichment?.actionable ? 90 : 60
  }

  private async assessNovelty(span: CausalSpan): Promise<number> {
    const unique = span.enrichment?.key_entities?.length || 0
    return Math.min(90, 70 + unique * 2)
  }

  private async assessFactualAccuracy(span: CausalSpan): Promise<number> {
    return (span as any).verifiable ? 85 : 70
  }

  private hasClearStructure(text: string): boolean {
    const indicators = [/\d+\.\s/, /[-*]\s/, /##?\s/, /:\s*\n/]
    return indicators.some(rx => rx.test(text))
  }
}

/**
 * Motor de Execução de Enzimas Ativado
 *
 * Executa pipeline de transformação usando enzimas especializadas
 */
export class ActivatedEnzymeEngine {
  private contextBuffer = new DynamicContextBuffer()
  private qualityEvaluator = new EmpiricalQualityEvaluator()

  async executeActivatedPlan(
    orchestrationSpan: OrchestrationSpan
  ): Promise<{ transformedSpan: CausalSpan; executionLog: ActivatedTransformationLog }> {
    const executionSteps: ActivatedExecutionStep[] = []
    let currentContext = orchestrationSpan.context
    let currentResponse = orchestrationSpan.response

    // 1) Contexto relevante
    const relevantContext = this.contextBuffer.getRelevantContext(orchestrationSpan)

    // 2) Executar enzimas selecionadas
    for (const enzyme of orchestrationSpan.orchestration.selected_enzymes) {
      const stepStart = Date.now()
      const inputHash = this.generateHash(currentContext + currentResponse)

      try {
        const result = await this.applyEnzymeWithMetrics(
          enzyme,
          currentContext,
          currentResponse,
          orchestrationSpan,
          relevantContext
        )

        const outputHash = this.generateHash(result.context + result.response)
        const duration = Date.now() - stepStart

        const step: ActivatedExecutionStep = {
          step_id: `step-${executionSteps.length + 1}`,
          enzyme,
          parameters: this.getEnzymeParameters(enzyme, orchestrationSpan),
          timestamp: new Date().toISOString(),
          duration_ms: duration,
          input_hash: inputHash,
          output_hash: outputHash,
          success: true,
          metrics: result.metrics,
          changes: result.changes
        }

        executionSteps.push(step)
        currentContext = result.context
        currentResponse = result.response
      } catch (error: any) {
        console.error(`❌ Enzyme ${enzyme} failed:`, error?.message || error)
        // Continua o pipeline mesmo se uma enzima falhar
      }
    }

    // 3) Avaliar qualidade final
    const finalQuality = await this.qualityEvaluator.evaluateSpan({
      ...orchestrationSpan,
      context: currentContext,
      response: currentResponse
    } as CausalSpan)

    // 4) Log de transformação
    const transformationLog: ActivatedTransformationLog = {
      timestamp: new Date().toISOString(),
      enzyme_applications: executionSteps.map(step => ({
        enzyme: step.enzyme,
        parameters: step.parameters,
        input_hash: step.input_hash,
        output_hash: step.output_hash,
        duration_ms: step.duration_ms || 0,
        changes: step.changes,
        success: step.success,
        metrics: step.metrics
      })),
      overall_metrics: this.calculateOverallMetrics(executionSteps),
      causal_depth: orchestrationSpan.orchestration.rules.causal_depth,
      quality_score: finalQuality.overall,
      intent_alignment: this.calculateIntentAlignment(orchestrationSpan, currentResponse),
      context_usage: {
        thread_spans_used: relevantContext.map(s => s.id).filter(Boolean),
        context_window_size: relevantContext.length,
        relevance_scores: this.calculateRelevanceScores(orchestrationSpan, relevantContext)
      }
    }

    // 5) Atualizar buffer de contexto
    if (orchestrationSpan.thread_id) {
      this.contextBuffer.addToThread(orchestrationSpan.thread_id, {
        ...orchestrationSpan,
        context: currentContext,
        response: currentResponse
      } as CausalSpan)
    }

    const transformedSpan: CausalSpan = {
      ...orchestrationSpan,
      context: currentContext,
      response: currentResponse,
      transformation_log: [
        ...(orchestrationSpan.transformation_log || []),
        transformationLog
      ]
    } as CausalSpan

    return { transformedSpan, executionLog: transformationLog }
  }

  private async applyEnzymeWithMetrics(
    enzyme: string,
    context: string,
    response: string,
    span: OrchestrationSpan,
    relevantContext: CausalSpan[]
  ): Promise<{ context: string; response: string; metrics: StepMetrics; changes: ChangeLog[] }> {
    const changes: ChangeLog[] = []
    let newContext = context
    let newResponse = response

    const intent = span.enrichment?.intent?.toLowerCase()
    const entities = (span.enrichment?.key_entities || []).map(e => e.toLowerCase())

    switch (enzyme) {
      case 'syntax-optimizer': {
        if ((intent?.includes('implement') || entities.includes('code'))) {
          const optimization = await this.optimizeCodeSyntax(response, entities)
          newResponse = optimization.result
          changes.push(...optimization.changes)
        }
        break
      }
      case 'security-enzyme': {
        if (
          intent?.includes('secure') ||
          entities.some(e => ['authentication', 'authorization', 'token', 'password', 'secret'].includes(e))
        ) {
          const sec = await this.applySecurityEnhancements(response)
          newResponse = sec.result
          changes.push(...sec.changes)
        }
        break
      }
      case 'semantic-enricher': {
        const enr = await this.semanticallyEnrich(response, relevantContext)
        newResponse = enr.result
        changes.push(...enr.changes)
        break
      }
      case 'context-preserver': {
        if (span.thread_id && relevantContext.length > 0) {
          const preserved = this.preserveThreadContext(context, response, relevantContext)
          newContext = preserved.context
          newResponse = preserved.response
          changes.push(...preserved.changes)
        }
        break
      }
      // Outras enzimas podem ser adicionadas aqui
      default:
        // noop
        break
    }

    const metrics = await this.calculateStepMetrics(
      { context, response },
      { context: newContext, response: newResponse },
      changes
    )

    return { context: newContext, response: newResponse, metrics, changes }
  }

  private getEnzymeParameters(enzyme: string, span: OrchestrationSpan): EnzymeParameters {
    const baseParams: EnzymeParameters = {
      intensity: span.orchestration.rules.intensity,
      mode: 'transform',
      focus_entities: span.enrichment?.key_entities,
      context_window: span.thread_id ? 3 : 0
    }

    const overrides: Record<string, Partial<EnzymeParameters>> = {
      'context-preserver': { mode: 'validate', context_window: 5 },
      'security-enzyme': { mode: 'validate', intensity: Math.min(1, (span.orchestration.rules.intensity || 0.8) * 0.9) },
      'semantic-enricher': { mode: 'enrich', intensity: 0.7 },
      'refactor-enzyme': { mode: 'optimize', intensity: 0.8 }
    }

    return { ...baseParams, ...(overrides[enzyme] || {}) }
  }

  private calculateOverallMetrics(steps: ActivatedExecutionStep[]): TransformationMetrics {
    if (!steps.length) {
      return {
        quality_delta: 0,
        complexity_delta: 0,
        coherence_preservation: 100,
        novelty_score: 0,
        utility_score: 0
      }
    }

    const q = steps.reduce((s, st) => s + st.metrics.quality_impact, 0)
    const c = steps.reduce((s, st) => s + st.metrics.complexity_change, 0)
    const coh = Math.round(steps.reduce((s, st) => s + st.metrics.coherence_preservation, 0) / steps.length)

    return {
      quality_delta: q,
      complexity_delta: c,
      coherence_preservation: coh,
      novelty_score: this.calculateNoveltyScore(steps),
      utility_score: this.calculateUtilityScore(steps)
    }
  }

  private calculateIntentAlignment(span: OrchestrationSpan, finalResponse: string): number {
    const intent = span.enrichment?.intent?.toLowerCase() || ''
    const resp = finalResponse.toLowerCase()

    if (intent.includes('implement') && resp.includes('function')) return 90
    if (intent.includes('explain') && resp.includes('because')) return 85
    if (intent.includes('verify') && resp.includes('check')) return 80
    if (intent.includes('optimize') && resp.includes('optimiz')) return 88
    return 75
  }

  private generateHash(content: string): string {
    try {
      return createHash('blake2b512').update(content).digest('hex')
    } catch {
      return createHash('sha256').update(content).digest('hex')
    }
  }

  // ---- Implementações específicas das enzimas ----

  private async optimizeCodeSyntax(code: string, entities: string[]): Promise<{ result: string; changes: ChangeLog[] }> {
    let result = code
    const changes: ChangeLog[] = []

    // Exemplo: normalizar "function name(" -> "const name = ("
    if (entities.includes('modern') || entities.includes('es6') || /function\s+\w+\s*\(/.test(code)) {
      const before = code.slice(0, 2000)
      result = result.replace(/function\s+(\w+)\s*\(/g, 'const $1 = (')
      if (result !== code) {
        changes.push({
          type: 'optimization',
          location: 'response',
          description: 'Converted traditional functions to arrow-like syntax',
          before_snippet: before,
          after_snippet: result.slice(0, 2000),
          impact_score: 7
        })
      }
    }

    // Remover ; duplos
    if (/;;/.test(result)) {
      const before = result.slice(0, 2000)
      result = result.replace(/;;+/g, ';')
      changes.push({
        type: 'optimization',
        location: 'response',
        description: 'Removed duplicate semicolons',
        before_snippet: before,
        after_snippet: result.slice(0, 2000),
        impact_score: 4
      })
    }

    return { result, changes }
  }

  private async applySecurityEnhancements(text: string): Promise<{ result: string; changes: ChangeLog[] }> {
    let result = text
    const changes: ChangeLog[] = []

    // Mask padrões de segredos
    const patterns: Array<[RegExp, string]> = [
      [/\b(AKI[A-Z0-9]{16,})\b/g, 'AKI************'],
      [/\b(secret|token|password)\s*[:=]\s*["'`]?([A-Za-z0-9_\-\.]{6,})["'`]?/gi, '$1: ***REDACTED***'],
      [/\bBearer\s+[A-Za-z0-9_\-\.=+/]{10,}\b/g, 'Bearer ***REDACTED***']
    ]

    const before = result.slice(0, 2000)
    for (const [rx, repl] of patterns) result = result.replace(rx, repl)

    if (result !== text) {
      changes.push({
        type: 'modification',
        location: 'response',
        description: 'Sanitized potential secrets (tokens/passwords)',
        before_snippet: before,
        after_snippet: result.slice(0, 2000),
        impact_score: 8
      })
    }

    return { result, changes }
  }

  private async semanticallyEnrich(
    response: string,
    relevant: CausalSpan[]
  ): Promise<{ result: string; changes: ChangeLog[] }> {
    if (!relevant.length) return { result: response, changes: [] }

    const hints = relevant
      .map(s => {
        const tags = (s.enrichment?.tags || []).slice(0, 3).join(', ')
        const ents = (s.enrichment?.key_entities || []).slice(0, 3).join(', ')
        return `• ctx:${s.id} | tags: [${tags}] | entities: [${ents}]`
      })
      .join('\n')

    const enriched = `${response}\n\n---\nContext links:\n${hints}`
    const changes: ChangeLog[] = [
      {
        type: 'addition',
        location: 'response',
        description: 'Appended cross-span semantic hints',
        before_snippet: response.slice(0, 1000),
        after_snippet: enriched.slice(0, 1000),
        impact_score: 6
      }
    ]

    return { result: enriched, changes }
  }

  private preserveThreadContext(
    context: string,
    response: string,
    relevant: CausalSpan[]
  ): { context: string; response: string; changes: ChangeLog[] } {
    const ids = relevant.map(s => s.id).filter(Boolean)
    if (!ids.length) return { context, response, changes: [] }

    const stitchedContext = `${context}\n[thread-context:${ids.join(',')}]`
    return {
      context: stitchedContext,
      response,
      changes: [
        {
          type: 'addition',
          location: 'context',
          description: 'Attached thread context reference window',
          before_snippet: context.slice(0, 500),
          after_snippet: stitchedContext.slice(0, 500),
          impact_score: 5
        }
      ]
    }
  }

  private async calculateStepMetrics(
    before: { context: string; response: string },
    after: { context: string; response: string },
    changes: ChangeLog[]
  ): Promise<StepMetrics> {
    const tokens = (s: string) => Math.ceil(s.trim().split(/\s+/).filter(Boolean).length)
    const beforeTokens = tokens(before.response)
    const afterTokens = tokens(after.response)

    const qualityImpact = Math.min(10, Math.max(-10,
      (changes.reduce((s, c) => s + (c.impact_score >= 7 ? 1 : 0), 0) * 2) -
      (changes.reduce((s, c) => s + (c.impact_score <= 3 ? 1 : 0), 0))
    ))

    const complexityChange = changes.some(c => c.type === 'restructuring') ? 1 :
                             changes.some(c => c.type === 'optimization') ? -1 : 0

    const coherence = 100 - (changes.some(c => c.type === 'restructuring') ? 5 : 0)

    const tokenChangePct = beforeTokens ? Math.round(((afterTokens - beforeTokens) / beforeTokens) * 100) : 0

    return {
      quality_impact: qualityImpact,
      complexity_change: complexityChange,
      token_change: tokenChangePct,
      coherence_preservation: Math.max(0, coherence)
    }
  }

  private calculateNoveltyScore(steps: ActivatedExecutionStep[]): number {
    const novel = steps.flatMap(s => s.changes.filter(c => c.impact_score >= 7))
    return Math.min(100, novel.length * 15)
  }

  private calculateUtilityScore(steps: ActivatedExecutionStep[]): number {
    const util = steps.flatMap(s =>
      s.changes.filter(c => c.type === 'addition' || c.type === 'optimization')
    )
    return Math.min(100, util.length * 20)
  }

  private calculateRelevanceScores(
    span: OrchestrationSpan,
    relevant: CausalSpan[]
  ): Record<string, number> {
    const tagsA = span.enrichment?.tags || []
    const entsA = span.enrichment?.key_entities || []
    const scores: Record<string, number> = {}

    for (const s of relevant) {
      const id = s.id || `span-${Math.random().toString(36).slice(2, 8)}`
      const tagsB = s.enrichment?.tags || []
      const entsB = s.enrichment?.key_entities || []
      const commonTags = tagsA.filter(t => tagsB.includes(t)).length
      const commonEnts = entsA.filter(e => entsB.includes(e)).length
      const topic = span.topic_id && s.topic_id && span.topic_id === s.topic_id ? 1 : 0
      const score = (commonTags + commonEnts + topic) / Math.max(1, tagsA.length + entsA.length + 1)
      scores[id] = Math.round(score * 100)
    }

    return scores
  }
}
