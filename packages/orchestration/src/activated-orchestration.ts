/**
 * @arenalab/orchestration/activated-orchestration
 *
 * Orquestração com Campos Latentes Ativados
 *
 * Coordena o processo completo de:
 * 1. Análise de span e extração de regras
 * 2. Seleção estratégica de enzimas
 * 3. Criação de plano de execução
 * 4. Previsão de qualidade e mutações
 */

import type {
  CausalSpan,
  OrchestrationSpan,
  OrchestrationRules,
  QualityScore
} from './types.js'

import {
  ActivatedEnzymeEngine,
  EmpiricalQualityEvaluator,
  DynamicContextBuffer
} from './activation-engine.js'

/**
 * Orquestrador Ativado
 *
 * Classe principal para gerenciar o processo de orquestração metalinguística
 */
export class ActivatedOrchestration {
  public readonly enzymeEngine = new ActivatedEnzymeEngine()
  private qualityEvaluator = new EmpiricalQualityEvaluator()
  private contextBuffer = new DynamicContextBuffer()

  /**
   * Criar span orquestrado com plano de execução
   */
  async createActivatedOrchestrationSpan(span: CausalSpan): Promise<OrchestrationSpan> {
    // 1) Qualidade atual
    const currentQuality = await this.qualityEvaluator.evaluateSpan(span)

    // 2) Regras com ativação latente
    const rules = this.extractActivatedRules(span, currentQuality)

    // 3) Seleção de enzimas por intent/entities
    const selectedEnzymes = this.selectActivatedEnzymes(span, rules)

    // 4) Plano de execução estruturado
    const executionPlan = this.createActivatedExecutionPlan(
      selectedEnzymes,
      span,
      rules,
      currentQuality.overall
    )

    // 5) Previsão de qualidade
    const expectedQuality = await this.predictActivatedQuality(span, rules, selectedEnzymes)

    return {
      ...span,
      orchestration: {
        rules,
        selected_enzymes: selectedEnzymes,
        execution_plan: executionPlan,
        predicted_mutations: this.predictActivatedMutations(selectedEnzymes, span),
        expected_quality: expectedQuality
      }
    } as OrchestrationSpan
  }

  /**
   * Extrair regras de orquestração com ativação baseada em qualidade
   */
  private extractActivatedRules(span: CausalSpan, currentQuality: QualityScore): OrchestrationRules {
    const baseRules: OrchestrationRules = {
      intensity: 0.8,
      causal_depth: 2,
      mutation_strategy: 'moderate'
    }

    // Intent → estratégia
    if (span.enrichment?.intent) {
      baseRules.mutation_strategy = this.mapIntentToStrategy(span.enrichment.intent)
    }

    // Qualidade atual → intensidade
    if (currentQuality.overall < 80) {
      baseRules.intensity = Math.max(0.5, baseRules.intensity * 0.8)
    } else if (currentQuality.overall > 85) {
      baseRules.intensity = Math.min(1.0, baseRules.intensity * 1.2)
    }

    // Entities → prioridade de enzimas
    if (span.enrichment?.key_entities?.length) {
      baseRules.enzyme_priority = this.prioritizeEnzymesByEntities(
        baseRules.enzyme_priority || [],
        span.enrichment.key_entities
      )
    }

    return baseRules
  }

  /**
   * Mapear intenção para estratégia de mutação
   */
  private mapIntentToStrategy(intent: string): 'conservative' | 'moderate' | 'aggressive' {
    const map: Record<string, 'conservative' | 'moderate' | 'aggressive'> = {
      verify: 'conservative',
      refactor: 'moderate',
      implement: 'aggressive',
      explain: 'moderate',
      debug: 'conservative',
      optimize: 'aggressive'
    }
    return map[intent] || 'moderate'
  }

  /**
   * Priorizar enzimas baseado nas entidades-chave
   */
  private prioritizeEnzymesByEntities(enzymes: string[], entities: string[]): string[] {
    const map: Record<string, string[]> = {
      code: ['syntax-optimizer', 'refactor-enzyme'],
      security: ['security-enzyme', 'token-validator'],
      database: ['query-optimizer', 'schema-enzyme'],
      performance: ['cache-enzyme', 'optimization-enzyme'],
      error: ['error-tracer', 'stack-analyzer']
    }

    const priority: string[] = []
    entities.forEach(e => {
      const rel = map[e.toLowerCase()]
      if (rel) priority.push(...rel)
    })

    return [...new Set([...priority, ...(enzymes || [])])]
  }

  /**
   * Selecionar enzimas ativadas baseado em regras
   */
  private selectActivatedEnzymes(span: CausalSpan, rules: OrchestrationRules): string[] {
    const base = this.selectEnzymes(rules)

    if (span.enrichment?.intent) {
      return base.filter(e => this.isEnzymeRelevantForIntent(e, span.enrichment!.intent!))
    }

    return base
  }

  /**
   * Seleção base de enzimas (pode ser customizado)
   */
  private selectEnzymes(rules: OrchestrationRules): string[] {
    const enzymes: string[] = []

    // Enzimas core sempre ativas
    enzymes.push('semantic-enricher')

    // Baseado na estratégia
    if (rules.mutation_strategy === 'aggressive') {
      enzymes.push('syntax-optimizer', 'refactor-enzyme')
    }

    if (rules.mutation_strategy === 'conservative') {
      enzymes.push('context-preserver', 'quality-maintainer')
    }

    // Baseado em prioridades
    if (rules.enzyme_priority?.length) {
      enzymes.push(...rules.enzyme_priority.slice(0, 3))
    }

    // Remover duplicatas
    return [...new Set(enzymes)]
  }

  /**
   * Verificar se enzima é relevante para intenção
   */
  private isEnzymeRelevantForIntent(enzyme: string, intent: string): boolean {
    const map: Record<string, string[]> = {
      implement: ['syntax-optimizer', 'endpoint-enzyme', 'refactor-enzyme'],
      verify: ['hash-validator', 'security-enzyme', 'quality-maintainer'],
      explain: ['context-preserver', 'semantic-enricher', 'pattern-matcher'],
      debug: ['error-tracer', 'stack-analyzer', 'pattern-matcher']
    }
    return map[intent]?.includes(enzyme) ?? true
  }

  /**
   * Criar plano de execução ativado
   */
  private createActivatedExecutionPlan(
    enzymes: string[],
    span: CausalSpan,
    rules: OrchestrationRules,
    currentQuality: number
  ): string[] {
    const plan: string[] = []

    // Validação inicial
    plan.push(`validate-causal-structure@depth=${span.transformation_log?.length || 0}`)

    // Snapshot de contexto se thread
    if (span.thread_id) {
      plan.push(`snapshot-thread-context@window=3`)
    }

    // Quality gate
    const lastQ = (span.transformation_log && span.transformation_log.length)
      ? span.transformation_log[span.transformation_log.length - 1].quality_score
      : currentQuality || 82

    plan.push(`quality-gate@threshold=80&current=${lastQ}`)

    // Aplicar enzimas
    enzymes.forEach(e => {
      const params = this.getEnzymeExecutionParams(e, rules)
      plan.push(`apply-${e}@${params}`)
    })

    // Verificação de alinhamento
    if (span.enrichment?.intent) {
      plan.push(`verify-intent-alignment@intent=${span.enrichment.intent}`)
    }

    // Registro de transformação
    plan.push('record-activated-transformation')

    return plan
  }

  /**
   * Obter parâmetros de execução para enzima
   */
  private getEnzymeExecutionParams(enzyme: string, rules: OrchestrationRules): string {
    const base = `intensity=${Math.round((rules.intensity || 0.8) * 100)}`
    const specific: Record<string, string> = {
      'context-preserver': `${base}&context_window=3&coherence_threshold=80`,
      'security-enzyme': `${base}&validation_level=strict`,
      'semantic-enricher': `${base}&depth=medium&connections=cross_domain`,
      'refactor-enzyme': `${base}&modernize=true&optimize=true`
    }
    return specific[enzyme] || base
  }

  /**
   * Prever qualidade após transformação
   */
  private async predictActivatedQuality(
    span: CausalSpan,
    rules: OrchestrationRules,
    enzymes: string[]
  ): Promise<number> {
    const q = await this.qualityEvaluator.evaluateSpan(span)
    let predicted = q.overall

    // Adicionar impacto de cada enzima
    enzymes.forEach(e => {
      predicted += this.getEnzymeQualityImpact(e, rules.intensity)
    })

    // Bonus por intent alignment
    if (span.enrichment?.intent) predicted += 2

    return Math.max(80, Math.min(95, Math.round(predicted)))
  }

  /**
   * Obter impacto de qualidade por enzima
   */
  private getEnzymeQualityImpact(enzyme: string, intensity: number): number {
    const base: Record<string, number> = {
      'context-preserver': 3,
      'quality-maintainer': 2,
      'semantic-enricher': 4,
      'syntax-optimizer': 2,
      'security-enzyme': 1,
      'refactor-enzyme': 3
    }
    const b = base[enzyme] ?? 1
    return b * (intensity || 0.8)
  }

  /**
   * Prever número de mutações
   */
  private predictActivatedMutations(enzymes: string[], span: CausalSpan): number {
    let base = enzymes.length * 12

    // Ajustar por intent
    const intent = span.enrichment?.intent
    if (intent === 'implement' || intent === 'optimize') {
      base *= 1.5
    }

    // Ajustar por qualidade prévia
    const last = span.transformation_log?.[span.transformation_log.length - 1]?.quality_score
    if (typeof last === 'number' && last < 80) {
      base *= 0.7
    }

    return Math.floor(base)
  }
}

/**
 * Funções utilitárias exportadas para compatibilidade
 */
export function extractOrchestrationRules(span: CausalSpan): OrchestrationRules {
  // Implementação básica - pode ser expandida
  return {
    intensity: 0.8,
    causal_depth: 2,
    mutation_strategy: 'moderate'
  }
}

export function selectEnzymes(rules: OrchestrationRules): string[] {
  const enzymes: string[] = ['semantic-enricher']

  if (rules.mutation_strategy === 'aggressive') {
    enzymes.push('syntax-optimizer', 'refactor-enzyme')
  }

  if (rules.mutation_strategy === 'conservative') {
    enzymes.push('context-preserver')
  }

  return enzymes
}
