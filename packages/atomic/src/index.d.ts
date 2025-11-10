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
    id: string;
    who: string;
    did: string;
    this: string;
    when: string;
    status: 'pending' | 'completed' | 'failed';
    if_ok?: string;
    if_not?: string;
    confirmed_by?: string;
    context?: SpanContext;
    metadata?: SpanMetadata;
}
export interface SpanContext {
    previous_spans?: string[];
    environment?: string;
    stakes?: 'low' | 'medium' | 'high';
    [key: string]: any;
}
export interface SpanMetadata {
    llm_provider?: string;
    model?: string;
    temperature?: number;
    tokens_used?: number;
    quality_score?: number;
    [key: string]: any;
}
/**
 * Create a new span
 */
export declare function createSpan(params: {
    who: string;
    did: string;
    this: string;
    status?: 'pending' | 'completed' | 'failed';
    if_ok?: string;
    if_not?: string;
    context?: SpanContext;
    metadata?: SpanMetadata;
}): Span;
/**
 * Serialize span to NDJSON line
 */
export declare function serializeSpan(span: Span): string;
/**
 * Deserialize span from NDJSON line
 */
export declare function deserializeSpan(line: string): Span;
export { validateSpan, validateSpanDetailed, validateSignedSpan } from './validator.js';
export type { ValidationResult, ValidationError, ValidationOptions } from './validator.js';
