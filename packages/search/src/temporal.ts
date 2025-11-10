/**
 * Temporal Index: Time-based filtering
 */

export interface TimeRange {
  start: Date
  end: Date
}

export class TemporalIndex {
  private timeline: Map<string, Date> = new Map()
  
  add(spanId: string, timestamp: Date): void {
    this.timeline.set(spanId, timestamp)
  }
  
  findInRange(range: TimeRange): string[] {
    const results: string[] = []
    
    for (const [spanId, timestamp] of this.timeline.entries()) {
      if (timestamp >= range.start && timestamp <= range.end) {
        results.push(spanId)
      }
    }
    
    return results
  }
}
