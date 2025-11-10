/**
 * Seed script: Generate sample spans for development
 * 
 * Generates coherent spans across domains (programming, geography, business, etc.)
 * based on patterns described in Formula.md
 */

import { writeFileSync } from 'fs'
import { randomUUID } from 'crypto'

interface Span {
  id: string
  who: string
  did: string
  this: string
  when: string
  status: 'pending' | 'completed' | 'failed'
  if_ok?: string
  if_not?: string
  context?: any
  metadata?: any
}

const DOMAINS = [
  'programming',
  'geography',
  'business_analysis',
  'creative_writing',
  'mathematics',
  'science',
]

const ACTIONS_BY_DOMAIN: Record<string, string[]> = {
  programming: ['write_code', 'debug_code', 'review_code', 'explain_code'],
  geography: ['ask_question', 'find_location', 'describe_place'],
  business_analysis: ['analyze_data', 'create_report', 'forecast_trends'],
  creative_writing: ['write_story', 'create_character', 'develop_plot'],
  mathematics: ['solve_equation', 'prove_theorem', 'calculate'],
  science: ['explain_concept', 'describe_experiment', 'analyze_results'],
}

function generateSpan(domain: string, index: number): Span {
  const actions = ACTIONS_BY_DOMAIN[domain]
  const action = actions[Math.floor(Math.random() * actions.length)]
  
  const span: Span = {
    id: `span_seed_${domain}_${index}`,
    who: 'user',
    did: action,
    this: `Sample ${action} for ${domain} - ${index}`,
    when: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
    status: 'completed',
    if_ok: `Generated response for ${action} in ${domain} domain`,
    context: {
      environment: domain,
      stakes: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    },
    metadata: {
      quality_score: 70 + Math.floor(Math.random() * 30), // 70-100
    },
  }
  
  return span
}

async function seed() {
  const spans: Span[] = []
  const spansPerDomain = 10
  
  for (const domain of DOMAINS) {
    for (let i = 0; i < spansPerDomain; i++) {
      spans.push(generateSpan(domain, i))
    }
  }
  
  // Write to NDJSON
  const ndjson = spans.map(s => JSON.stringify(s)).join('\n') + '\n'
  writeFileSync('data/examples/spans.generated.ndjson', ndjson)
  
  console.log(`✅ Generated ${spans.length} spans across ${DOMAINS.length} domains`)
}

seed().catch(console.error)
