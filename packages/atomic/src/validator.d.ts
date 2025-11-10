/**
 * @arenalab/atomic/validator
 *
 * Schema validation for JSON✯Atomic spans
 */
import type { Span } from './index.js';
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}
/**
 * Validation error
 */
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
/**
 * Validation options
 */
export interface ValidationOptions {
    /**
     * Validate signed spans (require signature fields)
     */
    requireSignature?: boolean;
    /**
     * Allow additional fields not in schema
     */
    allowAdditional?: boolean;
    /**
     * Strict timestamp validation (ISO 8601)
     */
    strictTimestamp?: boolean;
}
/**
 * Validate span against JSON✯Atomic schema
 *
 * @param span - Span to validate
 * @param options - Validation options
 * @returns Validation result with errors
 *
 * @example
 * ```typescript
 * const result = validateSpanDetailed(span)
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */
export declare function validateSpanDetailed(span: any, options?: ValidationOptions): ValidationResult;
/**
 * Simple boolean validation (for backward compatibility)
 */
export declare function validateSpan(span: any, options?: ValidationOptions): span is Span;
/**
 * Validate signed span
 */
export declare function validateSignedSpan(span: any): ValidationResult;
