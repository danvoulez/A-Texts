/**
 * @arenalab/utils/span-parser
 * 
 * Robust parser for reading and validating spans from NDJSON
 */

import type { Span } from '@arenalab/atomic'
import { validateSpanDetailed, type ValidationOptions } from '@arenalab/atomic'
import { readNDJSON, type NDJSONReaderOptions, type ParseResult } from './ndjson-reader.js'

/**
 * Validation result (re-exported for convenience)
 */
export type { ValidationResult, ValidationError, ValidationOptions } from '@arenalab/atomic'

/**
 * Filter options for span parsing
 */
export interface SpanFilter {
  /**
   * Filter by domain
   */
  domain?: string
  
  /**
   * Filter by action
   */
  action?: string
  
  /**
   * Filter by status
   */
  status?: 'pending' | 'completed' | 'failed'
  
  /**
   * Filter by timestamp range (ISO 8601)
   */
  timestampFrom?: string
  timestampTo?: string
  
  /**
   * Filter by minimum quality score
   */
  minQuality?: number
}

/**
 * Parser options
 */
export interface SpanParserOptions {
  /**
   * Validate against JSON✯Atomic schema
   */
  validateSchema?: boolean
  
  /**
   * Require signature fields
   */
  validateSignature?: boolean
  
  /**
   * Filters to apply
   */
  filters?: SpanFilter
  
  /**
   * NDJSON reader options
   */
  readerOptions?: NDJSONReaderOptions
  
  /**
   * Validation options
   */
  validationOptions?: ValidationOptions
}

/**
 * Parsing statistics
 */
export interface ParseStats {
  /**
   * Total lines processed
   */
  total: number
  
  /**
   * Valid spans
   */
  valid: number
  
  /**
   * Invalid spans
   */
  invalid: number
  
  /**
   * Filtered out spans
   */
  filtered: number
  
  /**
   * Parse errors (malformed JSON)
   */
  parseErrors: number
  
  /**
   * Validation errors (invalid schema)
   */
  validationErrors: number
  
  /**
   * Error reasons with counts
   */
  errorReasons: Map<string, number>
}

/**
 * Parse result
 */
export interface SpanParseResult {
  /**
   * Successfully parsed and validated spans
   */
  spans: Span[]
  
  /**
   * Parsing statistics
   */
  stats: ParseStats
  
  /**
   * Invalid spans with errors
   */
  invalid: Array<{
    line: number
    raw: string
    errors: string[]
  }>
}

/**
 * Span Parser
 * 
 * Robust parser for reading spans from NDJSON files with:
 * - Streaming support (handles large files)
 * - Schema validation
 * - Filtering
 * - Error tracking
 * 
 * @example
 * ```typescript
 * const parser = new SpanParser({
 *   validateSchema: true,
 *   filters: { status: 'completed', domain: 'arenalab-training' }
 * })
 * 
 * const result = await parser.parse(ndjsonContent)
 * console.log(`Valid: ${result.stats.valid}, Invalid: ${result.stats.invalid}`)
 * ```
 */
export class SpanParser {
  private options: Required<SpanParserOptions>
  
  constructor(options: SpanParserOptions = {}) {
    this.options = {
      validateSchema: options.validateSchema ?? true,
      validateSignature: options.validateSignature ?? false,
      filters: options.filters ?? {},
      readerOptions: options.readerOptions ?? {},
      validationOptions: options.validationOptions ?? {}
    }
  }
  
  /**
   * Parse NDJSON content
   * 
   * @param content - NDJSON string
   * @returns Parse result with spans and statistics
   */
  async parse(content: string): Promise<SpanParseResult> {
    const spans: Span[] = []
    const invalid: Array<{ line: number; raw: string; errors: string[] }> = []
    
    const stats: ParseStats = {
      total: 0,
      valid: 0,
      invalid: 0,
      filtered: 0,
      parseErrors: 0,
      validationErrors: 0,
      errorReasons: new Map()
    }
    
    // Read NDJSON
    for await (const result of readNDJSON<any>(content, this.options.readerOptions)) {
      stats.total++
      
      // Handle parse errors
      if (!result.success) {
        stats.parseErrors++
        stats.invalid++
        
        const reason = result.error || 'Unknown parse error'
        this.incrementErrorReason(stats.errorReasons, reason)
        
        invalid.push({
          line: result.line,
          raw: result.raw || '',
          errors: [reason]
        })
        continue
      }
      
      const span = result.data
      
      // Validate schema
      if (this.options.validateSchema) {
        const validation = validateSpanDetailed(
          span,
          {
            ...this.options.validationOptions,
            requireSignature: this.options.validateSignature
          }
        )
        
        if (!validation.valid) {
          stats.validationErrors++
          stats.invalid++
          
          const errors = validation.errors.map((e: any) => `${e.field}: ${e.message}`)
          errors.forEach((err: string) => this.incrementErrorReason(stats.errorReasons, err))
          
          invalid.push({
            line: result.line,
            raw: result.raw || '',
            errors
          })
          continue
        }
      }
      
      // Apply filters
      if (!this.matchesFilters(span)) {
        stats.filtered++
        continue
      }
      
      // Valid span
      stats.valid++
      spans.push(span)
    }
    
    return { spans, stats, invalid }
  }
  
  /**
   * Parse from file path (Node.js only)
   * For edge compatibility, use parse() with content string
   */
  async parseFile(path: string): Promise<SpanParseResult> {
    // This is a placeholder - in edge environments, content must be provided
    // In Node.js environments, this could use fs.readFile
    throw new Error('parseFile() requires Node.js filesystem. Use parse() with content string for edge compatibility.')
  }
  
  /**
   * Check if span matches filters
   */
  private matchesFilters(span: any): boolean {
    const { filters } = this.options
    
    // Domain filter
    if (filters.domain && span.context?.environment !== filters.domain) {
      return false
    }
    
    // Action filter
    if (filters.action && span.did !== filters.action) {
      return false
    }
    
    // Status filter
    if (filters.status && span.status !== filters.status) {
      return false
    }
    
    // Timestamp range filter
    if (filters.timestampFrom || filters.timestampTo) {
      const spanTime = new Date(span.when).getTime()
      
      if (filters.timestampFrom) {
        const fromTime = new Date(filters.timestampFrom).getTime()
        if (spanTime < fromTime) return false
      }
      
      if (filters.timestampTo) {
        const toTime = new Date(filters.timestampTo).getTime()
        if (spanTime > toTime) return false
      }
    }
    
    // Quality filter
    if (filters.minQuality !== undefined) {
      const quality = span.metadata?.quality_score
      if (quality === undefined || quality < filters.minQuality) {
        return false
      }
    }
    
    return true
  }
  
  /**
   * Increment error reason counter
   */
  private incrementErrorReason(map: Map<string, number>, reason: string): void {
    map.set(reason, (map.get(reason) || 0) + 1)
  }
}

/**
 * Quick parse helper function
 * 
 * @param content - NDJSON content
 * @param options - Parser options
 * @returns Parse result
 */
export async function parseSpans(
  content: string,
  options?: SpanParserOptions
): Promise<SpanParseResult> {
  const parser = new SpanParser(options)
  return parser.parse(content)
}
