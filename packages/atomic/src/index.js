/**
 * @arenalab/atomic
 *
 * JSON✯Atomic schema and types for spans.
 * Based on Formula.md specification for structured action-outcome data.
 */
// Import validator for internal use
import { validateSpan as _validateSpan } from './validator.js';
/**
 * Create a new span
 */
export function createSpan(params) {
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
    };
}
/**
 * Generate unique span ID
 */
function generateSpanId() {
    return `span_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
/**
 * Serialize span to NDJSON line
 */
export function serializeSpan(span) {
    return JSON.stringify(span);
}
/**
 * Deserialize span from NDJSON line
 */
export function deserializeSpan(line) {
    const span = JSON.parse(line);
    if (!_validateSpan(span)) {
        throw new Error('Invalid span format');
    }
    return span;
}
// Export validator functions
export { validateSpan, validateSpanDetailed, validateSignedSpan } from './validator.js';
