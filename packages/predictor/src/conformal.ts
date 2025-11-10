/**
 * Conformal Prediction: Uncertainty intervals
 * 
 * Split conformal method for prediction intervals.
 * Provides statistically valid uncertainty quantification.
 * 
 * @see docs/formula.md §Trajectory Matching - Conformal Prediction
 */

export interface ConformalInterval {
  lower: number
  upper: number
  coverage: number  // Target coverage (e.g., 0.95)
}

/**
 * Calibrate conformal predictor by computing quantile
 * 
 * Computes the (1-alpha) quantile of calibration scores.
 * This quantile is used to determine prediction intervals.
 * 
 * @param scores - Calibration scores (e.g., absolute errors on validation set)
 * @param alpha - Significance level (default: 0.05 for 95% coverage)
 * @returns Quantile value q_{1-alpha}
 * 
 * @see docs/formula.md §Split Conformal Prediction
 */
export function calibrate(
  scores: number[],
  alpha: number = 0.05
): number {
  if (scores.length === 0) {
    throw new Error('Cannot calibrate with empty scores array')
  }
  
  // Sort scores in ascending order
  const sorted = [...scores].sort((a, b) => a - b)
  
  // Compute quantile index (ceiling to be conservative)
  const n = sorted.length
  const quantileIdx = Math.ceil((n + 1) * (1 - alpha)) - 1
  
  // Clamp to valid range
  const idx = Math.max(0, Math.min(n - 1, quantileIdx))
  
  return sorted[idx]
}

/**
 * Compute prediction interval using conformal quantile
 * 
 * Given a point prediction and conformal quantile,
 * computes a prediction interval [lower, upper].
 * 
 * The interval has the property that P(Y ∈ [lower, upper]) ≥ 1-alpha
 * under standard conformal assumptions.
 * 
 * @param prediction - Point prediction
 * @param quantile - Conformal quantile from calibrate()
 * @param alpha - Significance level (for coverage metadata)
 * @returns Prediction interval with coverage guarantee
 */
export function interval(
  prediction: number,
  quantile: number,
  alpha: number = 0.05
): ConformalInterval {
  // Symmetric interval around prediction
  // In practice, this could be asymmetric based on the score function
  return {
    lower: prediction - quantile,
    upper: prediction + quantile,
    coverage: 1 - alpha,
  }
}

/**
 * Split conformal prediction (combined calibration + interval)
 * 
 * Legacy function that combines calibrate() and interval().
 * 
 * @param calibrationScores - Scores from calibration set
 * @param newScore - Score for new prediction
 * @param alpha - Significance level (default: 0.05)
 * @returns Prediction interval
 */
export function splitConformal(
  calibrationScores: number[],
  newScore: number,
  alpha: number = 0.05
): ConformalInterval {
  // Compute quantile from calibration scores
  const quantile = calibrate(calibrationScores, alpha)
  
  // Return interval around new score
  return interval(newScore, quantile, alpha)
}

/**
 * Compute conformal prediction set for classification
 * 
 * Returns set of labels that should be included in prediction set
 * to achieve target coverage.
 * 
 * @param scores - Map of label to conformity score
 * @param calibrationScores - Calibration scores from validation set
 * @param alpha - Significance level
 * @returns Array of labels to include in prediction set
 */
export function predictionSet(
  scores: Map<string, number>,
  calibrationScores: number[],
  alpha: number = 0.05
): string[] {
  const threshold = calibrate(calibrationScores, alpha)
  
  // Include all labels with score <= threshold
  const result: string[] = []
  for (const [label, score] of scores.entries()) {
    if (score <= threshold) {
      result.push(label)
    }
  }
  
  return result
}
