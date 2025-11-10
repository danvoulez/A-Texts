/**
 * Ensemble Strategies for combining multiple predictions
 * 
 * Combines predictions from multiple models or trajectory matchers
 * to improve accuracy and robustness.
 * 
 * @see docs/formula.md §Ensemble Methods
 */

export type VotingStrategy = 'majority' | 'weighted' | 'ranked'

export interface Prediction {
  output: string
  confidence: number
  score?: number
}

/**
 * Majority voting strategy
 * 
 * Selects the prediction that appears most frequently.
 * Breaks ties by choosing prediction with highest confidence.
 * 
 * @param predictions - Array of predictions
 * @returns Most common prediction
 * 
 * @see docs/formula.md §Majority Voting
 */
export function majorityVoting(predictions: Prediction[]): Prediction {
  if (predictions.length === 0) {
    throw new Error('No predictions to vote on')
  }
  
  if (predictions.length === 1) {
    return predictions[0]
  }
  
  // Count occurrences of each output
  const voteCounts = new Map<string, { count: number; predictions: Prediction[] }>()
  
  for (const pred of predictions) {
    const existing = voteCounts.get(pred.output)
    if (existing) {
      existing.count++
      existing.predictions.push(pred)
    } else {
      voteCounts.set(pred.output, {
        count: 1,
        predictions: [pred],
      })
    }
  }
  
  // Find output with most votes
  let maxVotes = 0
  let winner: Prediction = predictions[0]
  
  for (const [output, { count, predictions: preds }] of voteCounts.entries()) {
    if (count > maxVotes) {
      maxVotes = count
      // Among tied predictions, pick highest confidence
      winner = preds.reduce((best, curr) =>
        curr.confidence > best.confidence ? curr : best
      )
    } else if (count === maxVotes) {
      // Tie-breaker: highest confidence
      const tieBreaker = preds.reduce((best, curr) =>
        curr.confidence > best.confidence ? curr : best
      )
      if (tieBreaker.confidence > winner.confidence) {
        winner = tieBreaker
      }
    }
  }
  
  return winner
}

/**
 * Weighted voting strategy
 * 
 * Combines predictions using weighted average.
 * Weights represent relative importance of each prediction.
 * 
 * Process:
 * 1. Normalize weights to sum to 1
 * 2. Weight each prediction's confidence
 * 3. Select prediction with highest weighted confidence
 * 
 * @param predictions - Array of predictions
 * @param weights - Array of weights (same length as predictions)
 * @returns Prediction with highest weighted score
 * 
 * @see docs/formula.md §Weighted Voting
 */
export function weightedVoting(predictions: Prediction[], weights: number[]): Prediction {
  if (predictions.length === 0) {
    throw new Error('No predictions to vote on')
  }
  
  if (predictions.length !== weights.length) {
    throw new Error('Predictions and weights must have same length')
  }
  
  if (predictions.length === 1) {
    return predictions[0]
  }
  
  // Normalize weights
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight === 0) {
    // Fall back to majority voting if all weights are zero
    return majorityVoting(predictions)
  }
  
  const normalizedWeights = weights.map(w => w / totalWeight)
  
  // Group predictions by output
  const outputGroups = new Map<string, { indices: number[]; score: number }>()
  
  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i]
    const weight = normalizedWeights[i]
    const weightedScore = pred.confidence * weight
    
    const existing = outputGroups.get(pred.output)
    if (existing) {
      existing.indices.push(i)
      existing.score += weightedScore
    } else {
      outputGroups.set(pred.output, {
        indices: [i],
        score: weightedScore,
      })
    }
  }
  
  // Find output with highest weighted score
  let maxScore = -Infinity
  let winnerOutput = ''
  let winnerIndices: number[] = []
  
  for (const [output, { indices, score }] of outputGroups.entries()) {
    if (score > maxScore) {
      maxScore = score
      winnerOutput = output
      winnerIndices = indices
    }
  }
  
  // Return prediction with highest individual confidence among winners
  const winnerPredictions = winnerIndices.map(i => predictions[i])
  return winnerPredictions.reduce((best, curr) =>
    curr.confidence > best.confidence ? curr : best
  )
}

/**
 * Ranked voting strategy (Borda count)
 * 
 * Each prediction ranks others, and aggregate ranking determines winner.
 * Uses confidence scores to establish rankings.
 * 
 * @param predictions - Array of predictions
 * @returns Top-ranked prediction
 */
export function rankedVoting(predictions: Prediction[]): Prediction {
  if (predictions.length === 0) {
    throw new Error('No predictions to vote on')
  }
  
  if (predictions.length === 1) {
    return predictions[0]
  }
  
  // Simple implementation: sort by confidence and return top
  const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence)
  return sorted[0]
}
