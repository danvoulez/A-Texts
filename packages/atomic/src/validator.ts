/**
 * @arenalab/atomic/validator
 * 
 * Schema validation for JSON✯Atomic spans
 */

import type { Span } from './index.js'

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string
  message: string
  value?: any
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Validate signed spans (require signature fields)
   */
  requireSignature?: boolean
  
  /**
   * Allow additional fields not in schema
   */
  allowAdditional?: boolean
  
  /**
   * Strict timestamp validation (ISO 8601)
   */
  strictTimestamp?: boolean
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
export function validateSpanDetailed(
  span: any,
  options: ValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = []
  
  // Check if span is an object
  if (!span || typeof span !== 'object') {
    errors.push({
      field: 'span',
      message: 'Span must be an object',
      value: span
    })
    return { valid: false, errors }
  }
  
  // Required fields
  const required = ['id', 'who', 'did', 'this', 'when', 'status']
  for (const field of required) {
    if (!(field in span)) {
      errors.push({
        field,
        message: `Required field '${field}' is missing`
      })
    }
  }
  
  // Type validation
  if ('id' in span && typeof span.id !== 'string') {
    errors.push({
      field: 'id',
      message: 'Field "id" must be a string',
      value: span.id
    })
  }
  
  if ('who' in span && typeof span.who !== 'string') {
    errors.push({
      field: 'who',
      message: 'Field "who" must be a string',
      value: span.who
    })
  }
  
  if ('did' in span && typeof span.did !== 'string') {
    errors.push({
      field: 'did',
      message: 'Field "did" must be a string',
      value: span.did
    })
  }
  
  if ('this' in span && typeof span.this !== 'string') {
    errors.push({
      field: 'this',
      message: 'Field "this" must be a string',
      value: span.this
    })
  }
  
  if ('when' in span) {
    if (typeof span.when !== 'string') {
      errors.push({
        field: 'when',
        message: 'Field "when" must be a string (ISO 8601 timestamp)',
        value: span.when
      })
    } else if (options.strictTimestamp) {
      // Validate ISO 8601 format
      const date = new Date(span.when)
      if (isNaN(date.getTime())) {
        errors.push({
          field: 'when',
          message: 'Field "when" must be a valid ISO 8601 timestamp',
          value: span.when
        })
      }
    }
  }
  
  // Status enum validation
  if ('status' in span) {
    const validStatuses = ['pending', 'completed', 'failed']
    if (!validStatuses.includes(span.status)) {
      errors.push({
        field: 'status',
        message: `Field "status" must be one of: ${validStatuses.join(', ')}`,
        value: span.status
      })
    }
  }
  
  // Optional field type validation
  if ('if_ok' in span && span.if_ok !== undefined && typeof span.if_ok !== 'string') {
    errors.push({
      field: 'if_ok',
      message: 'Field "if_ok" must be a string',
      value: span.if_ok
    })
  }
  
  if ('if_not' in span && span.if_not !== undefined && typeof span.if_not !== 'string') {
    errors.push({
      field: 'if_not',
      message: 'Field "if_not" must be a string',
      value: span.if_not
    })
  }
  
  if ('confirmed_by' in span && span.confirmed_by !== undefined && typeof span.confirmed_by !== 'string') {
    errors.push({
      field: 'confirmed_by',
      message: 'Field "confirmed_by" must be a string',
      value: span.confirmed_by
    })
  }
  
  // Context validation
  if ('context' in span && span.context !== undefined) {
    if (typeof span.context !== 'object') {
      errors.push({
        field: 'context',
        message: 'Field "context" must be an object',
        value: span.context
      })
    } else {
      // Validate context.stakes enum
      if ('stakes' in span.context && span.context.stakes !== undefined) {
        const validStakes = ['low', 'medium', 'high']
        if (!validStakes.includes(span.context.stakes)) {
          errors.push({
            field: 'context.stakes',
            message: `Field "context.stakes" must be one of: ${validStakes.join(', ')}`,
            value: span.context.stakes
          })
        }
      }
      
      // Validate context.previous_spans is array
      if ('previous_spans' in span.context && span.context.previous_spans !== undefined) {
        if (!Array.isArray(span.context.previous_spans)) {
          errors.push({
            field: 'context.previous_spans',
            message: 'Field "context.previous_spans" must be an array',
            value: span.context.previous_spans
          })
        }
      }
    }
  }
  
  // Metadata validation
  if ('metadata' in span && span.metadata !== undefined && typeof span.metadata !== 'object') {
    errors.push({
      field: 'metadata',
      message: 'Field "metadata" must be an object',
      value: span.metadata
    })
  }
  
  // Signed span validation
  if (options.requireSignature) {
    const signatureFields = ['signature', 'publicKey', 'domain']
    for (const field of signatureFields) {
      if (!(field in span)) {
        errors.push({
          field,
          message: `Signed span requires field '${field}'`
        })
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Simple boolean validation (for backward compatibility)
 */
export function validateSpan(span: any, options?: ValidationOptions): span is Span {
  const result = validateSpanDetailed(span, options)
  return result.valid
}

/**
 * Validate signed span
 */
export function validateSignedSpan(span: any): ValidationResult {
  return validateSpanDetailed(span, { requireSignature: true })
}
