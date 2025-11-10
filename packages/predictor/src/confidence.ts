/**
 * Confidence Calibration: Platt scaling
 * 
 * Calibrates raw scores to well-calibrated probabilities.
 * Uses logistic regression (Platt scaling) as described in Formula.md.
 * 
 * @see docs/formula.md §Trajectory Matching - Confidence Calibration
 */

export interface CalibrationModel {
  a: number  // Logistic regression parameter
  b: number  // Logistic regression parameter
}

/**
 * Apply Platt scaling to convert raw score to calibrated probability
 * 
 * Formula: P = 1 / (1 + exp(a * score + b))
 * 
 * @param score - Raw prediction score
 * @param model - Calibration model parameters
 * @returns Calibrated probability [0, 1]
 */
export function applyPlatt(score: number, model: CalibrationModel): number {
  const linearCombination = model.a * score + model.b
  return 1 / (1 + Math.exp(linearCombination))
}

/**
 * Fit Platt scaling model using maximum likelihood
 * 
 * Uses iterative optimization to find optimal A and B parameters.
 * Implements simple gradient descent with line search.
 * 
 * @param scores - Array of raw prediction scores
 * @param labels - Array of true labels (1 for positive, 0 for negative)
 * @returns Calibration model parameters
 * 
 * @see docs/formula.md §Platt Scaling
 */
export function fitPlatt(
  scores: number[],
  labels: number[]
): CalibrationModel {
  if (scores.length !== labels.length) {
    throw new Error('scores and labels must have same length')
  }
  
  if (scores.length === 0) {
    return { a: -1, b: 0 }  // Default identity-like transform
  }
  
  // Initialize parameters
  let a = -1.0
  let b = 0.0
  
  // Count positive and negative examples
  const nPos = labels.filter(l => l > 0.5).length
  const nNeg = labels.length - nPos
  
  if (nPos === 0 || nNeg === 0) {
    // Can't calibrate with only one class
    return { a, b }
  }
  
  // Target probabilities (smoothed to avoid log(0))
  const hiTarget = (nPos + 1) / (nPos + 2)
  const loTarget = 1 / (nNeg + 2)
  
  // Iterative optimization (simplified Newton's method)
  const maxIter = 100
  const learningRate = 0.01
  const tolerance = 1e-6
  
  for (let iter = 0; iter < maxIter; iter++) {
    let gradA = 0
    let gradB = 0
    let logLikelihood = 0
    
    for (let i = 0; i < scores.length; i++) {
      const score = scores[i]
      const label = labels[i]
      const target = label > 0.5 ? hiTarget : loTarget
      
      // Current prediction
      const pred = applyPlatt(score, { a, b })
      
      // Log likelihood contribution
      logLikelihood += target * Math.log(pred + 1e-10) + 
                       (1 - target) * Math.log(1 - pred + 1e-10)
      
      // Gradient of negative log likelihood
      const error = pred - target
      gradA += error * score
      gradB += error
    }
    
    // Update parameters (gradient descent)
    const newA = a - learningRate * gradA
    const newB = b - learningRate * gradB
    
    // Check convergence
    const change = Math.abs(newA - a) + Math.abs(newB - b)
    a = newA
    b = newB
    
    if (change < tolerance) {
      break
    }
  }
  
  return { a, b }
}

/**
 * Calibrate confidence score using Platt scaling
 * 
 * Convenience function that applies calibration if model is provided,
 * otherwise returns identity transformation.
 * 
 * @param score - Raw confidence score
 * @param model - Optional calibration model
 * @returns Calibrated confidence [0, 100]
 */
export function calibrateConfidence(
  score: number,
  model?: CalibrationModel
): number {
  if (!model) {
    // No calibration: return normalized score
    return Math.max(0, Math.min(100, score))
  }
  
  // Apply Platt scaling and convert to percentage
  return applyPlatt(score, model) * 100
}

/**
 * Legacy plattScaling function (kept for compatibility)
 */
export function plattScaling(score: number, model: CalibrationModel): number {
  return applyPlatt(score, model)
}

/**
 * Legacy trainCalibration function (kept for compatibility)
 */
export function trainCalibration(
  scores: number[],
  labels: boolean[]
): CalibrationModel {
  // Convert boolean labels to numbers
  const numericLabels = labels.map(l => l ? 1 : 0)
  return fitPlatt(scores, numericLabels)
}
