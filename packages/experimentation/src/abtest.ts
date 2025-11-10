/**
 * A/B Testing
 */

export interface ABTest {
  id: string
  variants: string[]
  allocation: Record<string, number>
}

export function allocate(test: ABTest): string {
  // Simple random allocation
  const rand = Math.random()
  let cumulative = 0
  
  for (const [variant, prob] of Object.entries(test.allocation)) {
    cumulative += prob
    if (rand < cumulative) return variant
  }
  
  return test.variants[0]
}
