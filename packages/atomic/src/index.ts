/**
 * @arenalab/atomic
 * 
 * JSON✯Atomic schema and types for spans.
 * Based on Formula.md specification for structured action-outcome data.
 */

/**
 * Span: Atomic unit representing an action and its outcome
 * 
 * Follows JSON✯Atomic format:
 * - who: Actor
 * - did: Action
 * - this: Object/target
 * - when: Timestamp
 * - status: Execution status
 * - if_ok: Successful outcome
 * - if_not: Failure consequence
 */
export interface Span {
  id: string
  who: string
  did: string
  this: string
  when: string
  status: 'pending' | 'completed' | 'failed'
  if_ok?: string
  if_not?: string
  confirmed_by?: string
  context?: SpanContext
  metadata?: SpanMetadata
}

export interface SpanContext {
  previous_spans?: string[]
  environment?: string
  stakes?: 'low' | 'medium' | 'high'
  [key: string]: any
}

export interface SpanMetadata {
  llm_provider?: string
  model?: string
  temperature?: number
  tokens_used?: number
  quality_score?: number
  [key: string]: any
}

/**
 * Validate span against JSON✯Atomic schema
 */
export function validateSpan(span: any): span is Span {
  if (!span || typeof span !== 'object') return false
  
  const required = ['id', 'who', 'did', 'this', 'when', 'status']
  for (const field of required) {
    if (!(field in span)) return false
  }
  
  if (!['pending', 'completed', 'failed'].includes(span.status)) {
    return false
  }
  
  return true
}

/**
 * Create a new span
 */
export function createSpan(params: {
  who: string
  did: string
  this: string
  status?: 'pending' | 'completed' | 'failed'
  if_ok?: string
  if_not?: string
  context?: SpanContext
  metadata?: SpanMetadata
}): Span {
  return {
    id: generateSpanId(),
    who: params.who,
    did: params.did,
    this: params.this,
    when: new Date().toISOString(),
    status: params.status || 'pending',
    if_ok: params.if_ok,
    if_not: params.if_not,
    context: params.context,
    metadata: params.metadata,
  }
}

/**
 * Generate unique span ID
 */
function generateSpanId(): string {
  return `span_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Serialize span to NDJSON line
 */
export function serializeSpan(span: Span): string {
  return JSON.stringify(span)
}

/**
 * Deserialize span from NDJSON line
 */
export function deserializeSpan(line: string): Span {
  const span = JSON.parse(line)
  if (!validateSpan(span)) {
    throw new Error('Invalid span format')
  }
  return span
}
