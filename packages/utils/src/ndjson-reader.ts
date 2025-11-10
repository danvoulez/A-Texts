/**
 * @arenalab/utils/ndjson-reader
 * 
 * Streaming NDJSON reader for large files
 * Edge-compatible (uses ReadableStream)
 */

/**
 * Progress callback for NDJSON reading
 */
export interface NDJSONProgress {
  linesRead: number
  bytesRead: number
  errors: number
}

/**
 * Options for NDJSON reader
 */
export interface NDJSONReaderOptions {
  /**
   * Progress callback (called every N lines)
   */
  onProgress?: (progress: NDJSONProgress) => void
  
  /**
   * How often to call progress callback (in lines)
   */
  progressInterval?: number
  
  /**
   * Skip empty lines
   */
  skipEmpty?: boolean
  
  /**
   * Continue on parse errors
   */
  continueOnError?: boolean
}

/**
 * Parse result for a single line
 */
export interface ParseResult<T> {
  line: number
  success: boolean
  data?: T
  error?: string
  raw?: string
}

/**
 * Read NDJSON from string (for browser/edge compatibility)
 * 
 * @param content - NDJSON content as string
 * @param options - Reader options
 * @returns Async iterator of parsed objects
 * 
 * @example
 * ```typescript
 * const content = `{"id": 1}\n{"id": 2}\n`
 * for await (const result of readNDJSON(content)) {
 *   if (result.success) {
 *     console.log(result.data)
 *   }
 * }
 * ```
 */
export async function* readNDJSON<T = any>(
  content: string,
  options: NDJSONReaderOptions = {}
): AsyncIterableIterator<ParseResult<T>> {
  const {
    onProgress,
    progressInterval = 100,
    skipEmpty = true,
    continueOnError = true
  } = options

  const progress: NDJSONProgress = {
    linesRead: 0,
    bytesRead: 0,
    errors: 0
  }

  const lines = content.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (skipEmpty && !line) {
      continue
    }
    
    progress.linesRead++
    progress.bytesRead += line.length + 1 // +1 for newline
    
    // Try to parse
    try {
      const data = JSON.parse(line) as T
      yield {
        line: i + 1,
        success: true,
        data,
        raw: line
      }
    } catch (error) {
      progress.errors++
      
      const result: ParseResult<T> = {
        line: i + 1,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        raw: line
      }
      
      if (continueOnError) {
        yield result
      } else {
        throw new Error(`Parse error at line ${i + 1}: ${result.error}`)
      }
    }
    
    // Progress callback
    if (onProgress && progress.linesRead % progressInterval === 0) {
      onProgress(progress)
    }
  }
  
  // Final progress
  if (onProgress) {
    onProgress(progress)
  }
}

/**
 * Read NDJSON from multiple sources
 * 
 * @param sources - Array of NDJSON strings
 * @param options - Reader options
 * @returns Async iterator combining all sources
 */
export async function* readMultipleNDJSON<T = any>(
  sources: string[],
  options: NDJSONReaderOptions = {}
): AsyncIterableIterator<ParseResult<T>> {
  for (const source of sources) {
    yield* readNDJSON<T>(source, options)
  }
}

/**
 * Collect all results from NDJSON
 * (Use with caution for large files - loads everything into memory)
 * 
 * @param content - NDJSON content
 * @param options - Reader options
 * @returns Array of all parsed results
 */
export async function collectNDJSON<T = any>(
  content: string,
  options: NDJSONReaderOptions = {}
): Promise<ParseResult<T>[]> {
  const results: ParseResult<T>[] = []
  
  for await (const result of readNDJSON<T>(content, options)) {
    results.push(result)
  }
  
  return results
}
