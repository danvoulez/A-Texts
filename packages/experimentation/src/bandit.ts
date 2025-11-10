/**
 * Multi-Armed Bandits: UCB1 and Thompson Sampling
 * 
 * @see docs/formula.md §Experimentation - Multi-Armed Bandits
 */

export interface Arm {
  id: string
  pulls: number
  rewards: number
}

/**
 * UCB1 (Upper Confidence Bound) algorithm
 * 
 * Balances exploitation (choosing best arm) with exploration
 * (trying arms with high uncertainty).
 * 
 * Formula: score = avg_reward + sqrt(2 * ln(total_pulls) / arm_pulls)
 * 
 * @param arms - Array of arm statistics
 * @param totalPulls - Total pulls across all arms
 * @returns ID of arm to pull next
 */
export function ucb1(arms: Arm[], totalPulls: number): string {
  // Upper Confidence Bound
  let bestArm = arms[0]
  let bestScore = -Infinity
  
  for (const arm of arms) {
    if (arm.pulls === 0) return arm.id
    
    const avgReward = arm.rewards / arm.pulls
    const exploration = Math.sqrt((2 * Math.log(totalPulls)) / arm.pulls)
    const score = avgReward + exploration
    
    if (score > bestScore) {
      bestScore = score
      bestArm = arm
    }
  }
  
  return bestArm.id
}

/**
 * Thompson Sampling algorithm
 * 
 * Bayesian approach that samples from posterior distributions.
 * Assumes Beta prior for each arm's success probability.
 * 
 * For each arm:
 * - Model rewards as Beta(alpha, beta) where alpha = successes + 1, beta = failures + 1
 * - Sample from each arm's posterior distribution
 * - Choose arm with highest sample
 * 
 * @param arms - Array of arm statistics (assumes rewards in [0,1])
 * @returns ID of arm to pull next
 * 
 * @see docs/formula.md §Thompson Sampling
 */
export function thompsonSampling(arms: Arm[]): string {
  if (arms.length === 0) {
    throw new Error('No arms provided')
  }
  
  let bestArm = arms[0]
  let bestSample = -Infinity
  
  for (const arm of arms) {
    // Model as Beta distribution
    // alpha = successes + 1, beta = failures + 1
    const avgReward = arm.pulls > 0 ? arm.rewards / arm.pulls : 0.5
    
    // Estimate successes and failures from total rewards
    // Assumes rewards are in [0, 1] range
    const successes = arm.rewards
    const failures = arm.pulls - arm.rewards
    
    // Beta parameters (with prior)
    const alpha = successes + 1
    const beta = failures + 1
    
    // Sample from Beta(alpha, beta)
    const sample = betaSample(alpha, beta)
    
    if (sample > bestSample) {
      bestSample = sample
      bestArm = arm
    }
  }
  
  return bestArm.id
}

/**
 * Sample from Beta(alpha, beta) distribution
 * 
 * Uses the property that if X ~ Gamma(alpha, 1) and Y ~ Gamma(beta, 1),
 * then X/(X+Y) ~ Beta(alpha, beta)
 */
function betaSample(alpha: number, beta: number): number {
  const x = gammaSample(alpha, 1)
  const y = gammaSample(beta, 1)
  return x / (x + y)
}

/**
 * Sample from Gamma(shape, scale) distribution
 * 
 * Uses Marsaglia and Tsang's method for shape >= 1
 * For shape < 1, uses transformation property
 */
function gammaSample(shape: number, scale: number): number {
  if (shape < 1) {
    // For shape < 1, use transformation: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    return gammaSample(shape + 1, scale) * Math.pow(Math.random(), 1 / shape)
  }
  
  // Marsaglia and Tsang's method
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  
  while (true) {
    let x: number
    let v: number
    
    // Generate x from normal distribution N(0,1)
    do {
      x = normalSample()
      v = 1 + c * x
    } while (v <= 0)
    
    v = v * v * v
    const u = Math.random()
    const x2 = x * x
    
    // Accept/reject
    if (u < 1 - 0.0331 * x2 * x2) {
      return d * v * scale
    }
    
    if (Math.log(u) < 0.5 * x2 + d * (1 - v + Math.log(v))) {
      return d * v * scale
    }
  }
}

/**
 * Sample from standard normal distribution N(0,1)
 * 
 * Uses Box-Muller transform
 */
function normalSample(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}
