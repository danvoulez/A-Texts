/**
 * @arenalab/orchestration
 *
 * Sistema de orquestração metalinguística para transformação e enriquecimento de spans
 */

// Tipos
export type {
  CausalSpan,
  OrchestrationSpan,
  OrchestrationRules,
  SpanEnrichment,
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

// Motor de ativação
export {
  DynamicContextBuffer,
  EmpiricalQualityEvaluator,
  ActivatedEnzymeEngine
} from './activation-engine.js'

// Orquestração
export {
  ActivatedOrchestration,
  extractOrchestrationRules,
  selectEnzymes
} from './activated-orchestration.js'
