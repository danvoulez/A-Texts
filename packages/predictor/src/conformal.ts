/**
 * Conformal Prediction: Uncertainty intervals
 * 
 * Split conformal method for prediction intervals.
 */

export interface ConformalInterval {
  lower: number
  upper: number
  coverage: number  // Target coverage (e.g., 0.95)
}

export function splitConformal(
  calibrationScores: number[],
  newScore: number,
  alpha: number = 0.05
): ConformalInterval {
  // TODO: Implement split conformal prediction
  // For now, return stub interval
  
  return {
    lower: newScore - 10,
    upper: newScore + 10,
    coverage: 1 - alpha,
  }
}
