/**
 * Inverted Index: Filter by discrete attributes
 * 
 * Filter spans by action, domain, tags, etc.
 */

export class InvertedIndex {
  private indices: Map<string, Map<string, string[]>> = new Map()
  
  /**
   * Add span to index
   */
  add(spanId: string, field: string, value: string): void {
    if (!this.indices.has(field)) {
      this.indices.set(field, new Map())
    }
    
    const fieldIndex = this.indices.get(field)!
    if (!fieldIndex.has(value)) {
      fieldIndex.set(value, [])
    }
    
    fieldIndex.get(value)!.push(spanId)
  }
  
  /**
   * Find spans matching field value
   */
  find(field: string, value: string): string[] {
    return this.indices.get(field)?.get(value) || []
  }
  
  /**
   * Find spans matching multiple filters (AND)
   */
  findAll(filters: Record<string, string>): string[] {
    let results: Set<string> | null = null
    
    for (const [field, value] of Object.entries(filters)) {
      const matches = new Set(this.find(field, value))
      
      if (results === null) {
        results = matches
      } else {
        results = new Set([...results].filter(id => matches.has(id)))
      }
    }
    
    return results ? Array.from(results) : []
  }
}
