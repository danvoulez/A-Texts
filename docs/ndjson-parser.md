# NDJSON Span Parser

Robust parser for reading and validating JSON✯Atomic spans from NDJSON files.

## Features

- ✅ **Streaming Support**: Handle large files without loading everything into memory
- ✅ **Schema Validation**: Validate against JSON✯Atomic schema
- ✅ **Signed Spans**: Support for cryptographically signed spans
- ✅ **Flexible Filtering**: Filter by domain, action, status, timestamp, quality
- ✅ **Error Tracking**: Comprehensive error reporting and categorization
- ✅ **Progress Callbacks**: Track parsing progress in real-time
- ✅ **Edge Compatible**: No Node.js filesystem dependencies (uses strings)
- ✅ **TypeScript**: Full type safety with detailed types

## Quick Start

```typescript
import { SpanParser } from '@arenalab/utils'

// Basic usage
const parser = new SpanParser({
  validateSchema: true
})

const result = await parser.parse(ndjsonContent)

console.log(`Valid: ${result.stats.valid}`)
console.log(`Invalid: ${result.stats.invalid}`)
```

## Installation

This is part of the ArenaLab monorepo. The parser is available in `@arenalab/utils`:

```bash
pnpm install
pnpm build
```

## Usage Examples

### Example 1: Basic Parsing

```typescript
import { SpanParser } from '@arenalab/utils'

const parser = new SpanParser({
  validateSchema: true
})

const content = `
{"id":"span_001","who":"user","did":"ask","this":"question","when":"2025-01-10T10:00:00Z","status":"completed"}
{"id":"span_002","who":"ai","did":"answer","this":"response","when":"2025-01-10T10:01:00Z","status":"completed"}
`

const result = await parser.parse(content)

// Access parsed spans
result.spans.forEach(span => {
  console.log(`${span.who} ${span.did} ${span.this}`)
})

// Check statistics
console.log(`Total: ${result.stats.total}`)
console.log(`Valid: ${result.stats.valid}`)
console.log(`Invalid: ${result.stats.invalid}`)
```

### Example 2: Filtering

```typescript
// Filter by status
const parser = new SpanParser({
  validateSchema: true,
  filters: {
    status: 'completed'
  }
})

// Filter by domain
const parser = new SpanParser({
  filters: {
    domain: 'programming'
  }
})

// Filter by quality score
const parser = new SpanParser({
  filters: {
    minQuality: 90
  }
})

// Combine multiple filters
const parser = new SpanParser({
  filters: {
    status: 'completed',
    domain: 'arenalab-training',
    minQuality: 85,
    timestampFrom: '2025-01-01T00:00:00Z',
    timestampTo: '2025-01-31T23:59:59Z'
  }
})
```

### Example 3: Signed Spans

```typescript
const parser = new SpanParser({
  validateSchema: true,
  validateSignature: true  // Require signature fields
})

const result = await parser.parse(signedSpansContent)

// Only spans with signature, publicKey, and domain fields pass validation
```

### Example 4: Progress Tracking

```typescript
const parser = new SpanParser({
  validateSchema: true,
  readerOptions: {
    progressInterval: 100,  // Report every 100 lines
    onProgress: (progress) => {
      console.log(`Processed ${progress.linesRead} lines, ${progress.errors} errors`)
    }
  }
})

const result = await parser.parse(largeNDJSONContent)
```

### Example 5: Error Handling

```typescript
const parser = new SpanParser({
  validateSchema: true,
  readerOptions: {
    continueOnError: true  // Don't stop on errors
  }
})

const result = await parser.parse(content)

// Check invalid spans
if (result.invalid.length > 0) {
  console.log('Invalid spans:')
  result.invalid.forEach(inv => {
    console.log(`  Line ${inv.line}:`)
    inv.errors.forEach(err => console.log(`    - ${err}`))
  })
}

// Check error categories
console.log('\nError breakdown:')
for (const [reason, count] of result.stats.errorReasons.entries()) {
  console.log(`  ${count}x: ${reason}`)
}
```

## API Reference

### `SpanParser`

Main parser class.

```typescript
class SpanParser {
  constructor(options?: SpanParserOptions)
  parse(content: string): Promise<SpanParseResult>
}
```

### `SpanParserOptions`

```typescript
interface SpanParserOptions {
  // Validate against JSON✯Atomic schema
  validateSchema?: boolean
  
  // Require signature fields (for signed spans)
  validateSignature?: boolean
  
  // Filters to apply
  filters?: SpanFilter
  
  // NDJSON reader options
  readerOptions?: NDJSONReaderOptions
  
  // Validation options
  validationOptions?: ValidationOptions
}
```

### `SpanFilter`

```typescript
interface SpanFilter {
  domain?: string                // Filter by context.environment
  action?: string                // Filter by 'did' field
  status?: 'pending' | 'completed' | 'failed'
  timestampFrom?: string         // ISO 8601 timestamp
  timestampTo?: string           // ISO 8601 timestamp
  minQuality?: number            // Minimum metadata.quality_score
}
```

### `SpanParseResult`

```typescript
interface SpanParseResult {
  spans: Span[]                  // Valid spans
  stats: ParseStats              // Statistics
  invalid: Array<{               // Invalid spans with errors
    line: number
    raw: string
    errors: string[]
  }>
}
```

### `ParseStats`

```typescript
interface ParseStats {
  total: number                  // Total lines processed
  valid: number                  // Valid spans
  invalid: number                // Invalid spans
  filtered: number               // Filtered out
  parseErrors: number            // JSON parse errors
  validationErrors: number       // Schema validation errors
  errorReasons: Map<string, number>  // Error categorization
}
```

## NDJSON Reader

Low-level streaming reader (used internally by `SpanParser`):

```typescript
import { readNDJSON } from '@arenalab/utils'

for await (const result of readNDJSON(content)) {
  if (result.success) {
    console.log(result.data)
  } else {
    console.error(`Line ${result.line}: ${result.error}`)
  }
}
```

## Validator

Enhanced validator with detailed error messages:

```typescript
import { validateSpanDetailed } from '@arenalab/atomic'

const result = validateSpanDetailed(span, {
  requireSignature: true,
  strictTimestamp: true
})

if (!result.valid) {
  result.errors.forEach(err => {
    console.log(`${err.field}: ${err.message}`)
  })
}
```

## JSON✯Atomic Schema

Spans must conform to the JSON✯Atomic schema:

### Required Fields
- `id`: string - Unique identifier
- `who`: string - Actor
- `did`: string - Action
- `this`: string - Object/target
- `when`: string - ISO 8601 timestamp
- `status`: 'pending' | 'completed' | 'failed'

### Optional Fields
- `if_ok`: string - Successful outcome
- `if_not`: string - Failure consequence
- `confirmed_by`: string - Verification
- `context`: object - Contextual information
  - `previous_spans`: string[] - References to previous spans
  - `environment`: string - Domain/topic
  - `stakes`: 'low' | 'medium' | 'high'
- `metadata`: object - Additional metadata
  - `llm_provider`: string
  - `model`: string
  - `temperature`: number
  - `tokens_used`: number
  - `quality_score`: number (0-100)

### Signed Spans (Optional)
- `signature`: string - Cryptographic signature
- `publicKey`: string - Public key
- `domain`: string - Signing domain

## Running Examples

See all features in action:

```bash
npx tsx scripts/parse-spans.ts
```

This runs 6 examples demonstrating:
1. Basic parsing
2. Status filtering
3. Domain filtering
4. Quality filtering
5. Error analysis
6. Progress tracking

## Sample Data

Sample NDJSON files are available in `data/examples/`:
- `spans.sample.ndjson` - Basic examples
- `spans.signed.ndjson` - Signed spans examples

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  Span,
  SpanContext,
  SpanMetadata,
  SpanParser,
  SpanParseResult,
  SpanFilter,
  ParseStats,
  ValidationResult,
  ValidationError
} from '@arenalab/utils'
```

## Edge Compatibility

The parser is designed to work in edge environments (Cloudflare Workers, Vercel Edge, etc.):

- ✅ No Node.js `fs` module dependencies
- ✅ Works with strings (pre-loaded content)
- ✅ Uses standard Web APIs (ReadableStream concepts)
- ✅ ESM module format

For Node.js file reading, load content first:

```typescript
import { readFileSync } from 'fs'

const content = readFileSync('spans.ndjson', 'utf-8')
const result = await parser.parse(content)
```

## Performance

- **Streaming**: Processes lines one at a time (low memory usage)
- **Fast**: No heavy dependencies, pure TypeScript
- **Scalable**: Progress callbacks for monitoring large files
- **Efficient**: Early filtering reduces processing time

## Error Handling

The parser is robust and handles:

- ✅ Malformed JSON
- ✅ Missing required fields
- ✅ Invalid field types
- ✅ Invalid enum values
- ✅ Empty lines
- ✅ Unexpected fields (when allowed)

All errors are categorized and counted for easy debugging.

## Contributing

This parser is part of the ArenaLab Training repository. To contribute:

1. Make changes in `packages/utils/src/` or `packages/atomic/src/`
2. Run `pnpm build` to compile
3. Test with `npx tsx scripts/parse-spans.ts`
4. Submit a PR

## License

Part of the ArenaLab project. See LICENSE file.

## References

- [Formula.md](../../docs/formula.md) - JSON✯Atomic specification
- [atomic.schema.json](../../packages/atomic/src/atomic.schema.json) - JSON Schema
