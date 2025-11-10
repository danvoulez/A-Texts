/**
 * Synthesizer: Generate response from evidence
 * 
 * Combines trajectories to produce final output.
 * 
 * @see docs/formula.md §Trajectory Matching - Synthesis
 */

import type { Evidence } from './matcher'

/**
 * Synthesize response from evidence trajectories
 * 
 * Strategy (from Formula.md):
 * 1. If top evidence has very high score (>0.9), use it directly
 * 2. If multiple similar outcomes, pick most common (consensus)
 * 3. Otherwise, synthesize from top 3 evidence items
 * 
 * @param evidence - Array of evidence items with scores
 * @param context - Original query context
 * @returns Synthesized output string
 * 
 * @see docs/formula.md §Synthesis Strategy
 */
export function synthesize(evidence: Evidence[], context: any): string {
  if (!evidence || evidence.length === 0) {
    return 'Unable to generate prediction from available data.'
  }
  
  // Sort by score descending
  const sorted = [...evidence].sort((a, b) => b.score - a.score)
  
  // Strategy 1: High confidence - use top result directly
  if (sorted[0].score > 0.9) {
    return sorted[0].content
  }
  
  // Strategy 2: Multiple evidence - find consensus
  if (sorted.length >= 3) {
    const topEvidence = sorted.slice(0, Math.min(5, sorted.length))
    const outcomes = topEvidence.map(e => e.content)
    
    // Find most common outcome
    const mostCommon = findMostCommonOutcome(outcomes)
    return mostCommon
  }
  
  // Strategy 3: Few evidence - weighted synthesis
  if (sorted.length >= 2) {
    // Combine top 2 with weight based on scores
    const total = sorted[0].score + sorted[1].score
    if (total > 0) {
      const w1 = sorted[0].score / total
      const w2 = sorted[1].score / total
      
      // If scores are similar, mention both options
      if (Math.abs(w1 - w2) < 0.2) {
        return `${sorted[0].content} (primary option). Alternative: ${sorted[1].content}`
      }
    }
  }
  
  // Fallback: return top result
  return sorted[0].content
}

/**
 * Find most common outcome from list
 * 
 * Simple heuristic: exact string matching with frequency count.
 * Returns the most frequently occurring outcome.
 */
function findMostCommonOutcome(outcomes: string[]): string {
  if (outcomes.length === 0) return ''
  
  // Count exact matches
  const counts = new Map<string, number>()
  for (const outcome of outcomes) {
    counts.set(outcome, (counts.get(outcome) || 0) + 1)
  }
  
  // Return most frequent
  let maxCount = 0
  let mostCommon = outcomes[0]
  
  for (const [outcome, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = outcome
    }
  }
  
  return mostCommon
}
