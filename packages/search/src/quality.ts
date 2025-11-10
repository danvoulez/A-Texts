/**
 * Quality Index: Filter by quality score buckets
 */

export class QualityIndex {
  private buckets: Map<number, string[]> = new Map()
  
  add(spanId: string, qualityScore: number): void {
    const bucket = Math.floor(qualityScore / 10) * 10
    
    if (!this.buckets.has(bucket)) {
      this.buckets.set(bucket, [])
    }
    
    this.buckets.get(bucket)!.push(spanId)
  }
  
  findAbove(minQuality: number): string[] {
    const results: string[] = []
    
    for (const [bucket, spans] of this.buckets.entries()) {
      if (bucket >= minQuality) {
        results.push(...spans)
      }
    }
    
    return results
  }
}
