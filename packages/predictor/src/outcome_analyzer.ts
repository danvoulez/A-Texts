/**
 * Outcome Analyzer: Analyze trajectory outcomes
 * 
 * Metrics: success rate, cost, risk, score composition
 * 
 * @see docs/formula.md §Outcome Analysis
 */

export interface OutcomeAnalysis {
  mostLikely: string
  probability: number
  alternatives: Array<{ outcome: string; probability: number }>
  confidence: number
  successRate?: number
  avgQuality?: number
}

export interface Trajectory {
  id: string
  outcome?: string
  if_ok?: string
  if_not?: string
  status?: 'completed' | 'failed' | 'pending'
  quality?: { total_score?: number }
  score?: number
}

/**
 * Analyze outcomes from trajectories
 * 
 * Calculates:
 * - Most likely outcome (based on frequency)
 * - Probability distribution across outcomes
 * - Success rate
 * - Average quality
 * - Confidence score
 * 
 * @param trajectories - Array of trajectory objects
 * @returns Outcome analysis with probabilities and confidence
 * 
 * @see docs/formula.md §Trajectory Outcome Analysis
 */
export function analyzeOutcomes(trajectories: Trajectory[]): OutcomeAnalysis {
  if (!trajectories || trajectories.length === 0) {
    return {
      mostLikely: 'unknown',
      probability: 0,
      alternatives: [],
      confidence: 0,
    }
  }
  
  // Extract outcomes and count frequencies
  const outcomeCounts = new Map<string, number>()
  const outcomeScores = new Map<string, number[]>()
  let successCount = 0
  let totalQuality = 0
  let qualityCount = 0
  
  for (const traj of trajectories) {
    // Determine outcome (prefer if_ok, fallback to outcome field)
    const outcome = traj.if_ok || traj.outcome || 'unknown'
    
    outcomeCounts.set(outcome, (outcomeCounts.get(outcome) || 0) + 1)
    
    // Track scores for this outcome
    if (traj.score !== undefined) {
      if (!outcomeScores.has(outcome)) {
        outcomeScores.set(outcome, [])
      }
      outcomeScores.get(outcome)!.push(traj.score)
    }
    
    // Track success rate
    if (traj.status === 'completed') {
      successCount++
    }
    
    // Track quality
    if (traj.quality?.total_score !== undefined) {
      totalQuality += traj.quality.total_score
      qualityCount++
    }
  }
  
  // Calculate probabilities
  const total = trajectories.length
  const outcomeProbabilities: Array<{ outcome: string; probability: number }> = []
  
  for (const [outcome, count] of outcomeCounts.entries()) {
    outcomeProbabilities.push({
      outcome,
      probability: count / total,
    })
  }
  
  // Sort by probability descending
  outcomeProbabilities.sort((a, b) => b.probability - a.probability)
  
  // Most likely outcome
  const mostLikely = outcomeProbabilities[0]?.outcome || 'unknown'
  const probability = outcomeProbabilities[0]?.probability || 0
  
  // Alternatives (exclude most likely)
  const alternatives = outcomeProbabilities.slice(1, 4) // Top 3 alternatives
  
  // Calculate confidence based on:
  // 1. Probability of most likely outcome (higher = more confident)
  // 2. Number of trajectories (more data = more confident)
  // 3. Average quality (higher quality = more confident)
  const probabilityFactor = probability
  const sampleSizeFactor = Math.min(total / 10, 1.0) // Cap at 10 trajectories
  const qualityFactor = qualityCount > 0 ? (totalQuality / qualityCount) / 100 : 0.5
  
  const confidence = (probabilityFactor * 0.5 + sampleSizeFactor * 0.3 + qualityFactor * 0.2) * 100
  
  return {
    mostLikely,
    probability,
    alternatives,
    confidence: Math.max(0, Math.min(100, confidence)),
    successRate: successCount / total,
    avgQuality: qualityCount > 0 ? totalQuality / qualityCount : undefined,
  }
}
