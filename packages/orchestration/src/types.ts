/**
 * @arenalab/orchestration/types
 *
 * Tipos para orquestração metalinguística e transformação de spans
 */

import type { Span } from '@arenalab/atomic'

/**
 * CausalSpan: Span enriquecido com contexto causal e semântico
 */
export interface CausalSpan extends Span {
  thread_id?: string
  topic_id?: string

  // Campos reestruturados para orquestração
  context: string  // Contexto da ação (equivale a "this")
  response: string // Resposta/outcome (equivale a "if_ok")

  // Enriquecimento semântico
  enrichment?: SpanEnrichment

  // Logs de transformação
  transformation_log?: ActivatedTransformationLog[]

  // Campos originais do Span são mantidos via extends
}

export interface SpanEnrichment {
  intent?: string               // Intenção extraída: explain, implement, verify, etc.
  key_entities?: string[]       // Entidades-chave extraídas
  tags?: string[]               // Tags semânticas
  complexity?: 'low' | 'medium' | 'high'
  actionable?: boolean
}

/**
 * OrchestrationSpan: CausalSpan + metadados de orquestração
 */
export interface OrchestrationSpan extends CausalSpan {
  orchestration: {
    rules: OrchestrationRules
    selected_enzymes: string[]
    execution_plan: string[]
    predicted_mutations: number
    expected_quality: number
  }
}

export interface OrchestrationRules {
  intensity: number                    // 0..1
  causal_depth: number                 // Profundidade de análise causal
  mutation_strategy: 'conservative' | 'moderate' | 'aggressive'
  enzyme_priority?: string[]           // Prioridade de aplicação de enzimas
}

/**
 * Quality Score - 5D Quality Meter
 */
export interface QualityScore {
  overall: number                      // 0..100
  clarity: number                      // 0..100
  coherence: number                    // 0..100
  depth: number                        // 0..100
  actionability: number                // 0..100
  novelty: number                      // 0..100
  accuracy: number                     // 0..100
  evaluated_at: string                 // ISO timestamp
}

/**
 * Activated Transformation Log
 */
export interface ActivatedTransformationLog {
  timestamp: string
  enzyme_applications: EnzymeApplication[]
  overall_metrics: TransformationMetrics
  causal_depth: number
  quality_score: number
  intent_alignment: number             // 0..100
  context_usage: ContextUsage
}

export interface EnzymeApplication {
  enzyme: string
  parameters: EnzymeParameters
  input_hash: string
  output_hash: string
  duration_ms: number
  changes: ChangeLog[]
  success: boolean
  error?: string
  metrics?: StepMetrics
}

export interface EnzymeParameters {
  intensity: number                    // 0..1
  mode: 'transform' | 'enrich' | 'validate' | 'optimize'
  focus_entities?: string[]
  context_window?: number
  custom_rules?: string[]
}

export interface StepMetrics {
  quality_impact: number               // -10..+10
  complexity_change: number            // -5..+5
  token_change: number                 // % change
  coherence_preservation: number       // 0..100
}

export interface ChangeLog {
  type: 'addition' | 'deletion' | 'modification' | 'restructuring' | 'optimization'
  location: 'context' | 'response' | 'metadata' | 'structure'
  description: string
  before_snippet?: string
  after_snippet?: string
  impact_score: number                 // 1..10
}

export interface TransformationMetrics {
  quality_delta: number
  complexity_delta: number
  coherence_preservation: number
  novelty_score: number
  utility_score: number
}

export interface ContextUsage {
  thread_spans_used: string[]
  context_window_size: number
  relevance_scores: { [span_id: string]: number }
}

/**
 * Activated Execution Step
 */
export interface ActivatedExecutionStep {
  step_id: string
  enzyme: string
  parameters: EnzymeParameters
  timestamp: string
  duration_ms?: number
  input_hash: string
  output_hash: string
  success: boolean
  metrics: StepMetrics
  changes: ChangeLog[]
}
