/**
 * Configuration constants
 * Defaults from Formula.md
 */

export const DEFAULTS = {
  // Search parameters
  TOP_K: 10,
  MIN_QUALITY: 70,
  EF_SEARCH: 50,
  
  // Ensemble
  EMIN: 3,  // Minimum ensemble size
  
  // Confidence thresholds
  MIN_CONFIDENCE: 50,
  FALLBACK_THRESHOLD: 50,
  
  // Quality meter
  QUALITY_DIMENSIONS: ['completeness', 'provenance', 'impact', 'uniqueness', 'coherence'],
  
  // SLOs
  P95_LATENCY_MS: 400,
  MAX_ERROR_RATE: 0.05,
  
  // Bandit
  UCB_C: 2,  // UCB exploration constant
}
