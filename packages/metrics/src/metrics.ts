/**
 * Metrics: Counters, histograms, gauges
 * 
 * Prometheus text format export.
 * SLOs/metrics from Formula.md:
 * - P95 latency < 400ms
 * - Error rate < 5%
 * - Average confidence > 50%
 */

export class MetricsCollector {
  private counters: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()
  private gauges: Map<string, number> = new Map()
  
  incrementCounter(name: string, value: number = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) + value)
  }
  
  observeHistogram(name: string, value: number): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, [])
    }
    this.histograms.get(name)!.push(value)
  }
  
  setGauge(name: string, value: number): void {
    this.gauges.set(name, value)
  }
  
  /**
   * Export metrics in Prometheus text format
   */
  export(): string {
    const lines: string[] = []
    
    // Counters
    for (const [name, value] of this.counters.entries()) {
      lines.push(`# TYPE ${name} counter`)
      lines.push(`${name} ${value}`)
    }
    
    // Gauges
    for (const [name, value] of this.gauges.entries()) {
      lines.push(`# TYPE ${name} gauge`)
      lines.push(`${name} ${value}`)
    }
    
    // Histograms (simplified - bucket representation omitted for brevity)
    for (const [name, values] of this.histograms.entries()) {
      const count = values.length
      const sum = values.reduce((a, b) => a + b, 0)
      
      lines.push(`# TYPE ${name} histogram`)
      lines.push(`${name}_count ${count}`)
      lines.push(`${name}_sum ${sum}`)
    }
    
    return lines.join('\n') + '\n'
  }
}

export const metrics = new MetricsCollector()
