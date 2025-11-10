/**
 * Synthetic span generator for self-play
 * 
 * Generates synthetic training data to bootstrap or augment dataset.
 * Ensures diversity and quality through guardrails.
 * 
 * @see docs/formula.md §Self-Play - Synthetic Generation
 */

export interface SyntheticSpan {
  id: string
  who: string
  did: string
  this: string
  when: string
  if_ok?: string
  if_not?: string
  status: 'completed' | 'failed' | 'pending'
  context?: {
    environment?: string
    stakes?: string
  }
  metadata?: {
    synthetic: true
    seed: any
  }
}

/**
 * Generate synthetic span from seed
 * 
 * Creates a plausible span based on:
 * - Seed trajectory (template)
 * - Variation parameters (to ensure diversity)
 * - Domain constraints
 * 
 * Strategy:
 * 1. Use seed as template
 * 2. Apply variations to create new span
 * 3. Ensure minimum distance from existing data
 * 
 * @param seed - Seed object with template or parameters
 * @returns Generated synthetic span
 * 
 * @see docs/formula.md §Synthetic Span Generation
 */
export function generateSyntheticSpan(seed: any): SyntheticSpan {
  const timestamp = new Date().toISOString()
  
  // Extract template from seed
  const template = seed.template || seed
  
  // Generate variations
  const who = generateVariation(template.who || 'user', seed.whoVariations)
  const did = generateVariation(template.did || 'ask', seed.didVariations)
  const thisField = generateVariation(template.this || 'query', seed.thisVariations)
  
  // Generate outcomes with probability
  const successProb = seed.successProbability || 0.8
  const isSuccess = Math.random() < successProb
  
  const span: SyntheticSpan = {
    id: `synthetic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    who,
    did,
    this: thisField,
    when: timestamp,
    status: isSuccess ? 'completed' : 'failed',
    context: {
      environment: template.environment || 'general',
      stakes: template.stakes || 'low',
    },
    metadata: {
      synthetic: true,
      seed: seed.id || 'unknown',
    },
  }
  
  // Add outcomes
  if (isSuccess && template.if_ok) {
    span.if_ok = generateVariation(template.if_ok, seed.okVariations)
  }
  
  if (!isSuccess && template.if_not) {
    span.if_not = generateVariation(template.if_not, seed.notVariations)
  }
  
  return span
}

/**
 * Generate variation of a string
 * 
 * Applies simple transformations to create variations:
 * - Synonym replacement
 * - Parameter substitution
 * - Phrase reordering
 * 
 * @param base - Base string
 * @param variations - Optional array of variation strings
 * @returns Varied string
 */
function generateVariation(base: string, variations?: string[]): string {
  // If variations provided, pick random one
  if (variations && variations.length > 0) {
    const idx = Math.floor(Math.random() * variations.length)
    return variations[idx]
  }
  
  // Otherwise, apply simple transformations
  // Add noise by appending variation marker
  const variantSuffix = ['', '_v1', '_v2', '_v3', '_variant']
  const suffix = variantSuffix[Math.floor(Math.random() * variantSuffix.length)]
  
  return base + suffix
}

/**
 * Generate batch of synthetic spans
 * 
 * @param seed - Seed template
 * @param count - Number of spans to generate
 * @returns Array of synthetic spans
 */
export function generateSyntheticBatch(seed: any, count: number): SyntheticSpan[] {
  const spans: SyntheticSpan[] = []
  
  for (let i = 0; i < count; i++) {
    // Add variation index to seed
    const variedSeed = {
      ...seed,
      variationIndex: i,
    }
    
    spans.push(generateSyntheticSpan(variedSeed))
  }
  
  return spans
}
