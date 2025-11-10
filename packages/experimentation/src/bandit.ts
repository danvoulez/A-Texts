/**
 * Multi-Armed Bandits: UCB1 and Thompson Sampling
 */

export interface Arm {
  id: string
  pulls: number
  rewards: number
}

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

export function thompsonSampling(arms: Arm[]): string {
  // TODO: Implement Thompson sampling
  return arms[0].id
}
