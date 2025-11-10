/**
 * Inverted Index: Filter by discrete attributes
 * 
 * Filter spans by action, domain, tags, etc.
 * Supports efficient lookup of spans by categorical attributes.
 * 
 * @see docs/formula.md §Trajectory Matching - Inverted Index
 */

export class InvertedIndex {
  private indices: Map<string, Map<string, string[]>> = new Map()
  
  /**
   * Add span to index
   * 
   * @param spanId - Unique span identifier
   * @param field - Field name (e.g., 'action', 'domain', 'tag')
   * @param value - Field value
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
   * 
   * @param field - Field name
   * @param value - Field value
   * @returns Array of matching span IDs
   */
  find(field: string, value: string): string[] {
    return this.indices.get(field)?.get(value) || []
  }
  
  /**
   * Filter spans by action
   * 
   * Convenience method for filtering by 'did' (action) field.
   * Supports exact match and fuzzy matching.
   * 
   * @param ids - Initial set of span IDs to filter (optional)
   * @param action - Action string to match
   * @param fuzzy - Enable fuzzy matching (default: false)
   * @returns Filtered span IDs
   * 
   * @see docs/formula.md §Trajectory Matching - Action Filtering
   */
  filterByAction(ids: string[] | null, action: string, fuzzy: boolean = false): string[] {
    if (!fuzzy) {
      // Exact match
      const matches = this.find('action', action)
      
      // If ids provided, return intersection
      if (ids !== null) {
        const idSet = new Set(ids)
        return matches.filter(id => idSet.has(id))
      }
      
      return matches
    }
    
    // Fuzzy matching: find similar actions
    const actionIndex = this.indices.get('action')
    if (!actionIndex) {
      return []
    }
    
    const allMatches = new Set<string>()
    const lowerAction = action.toLowerCase()
    
    for (const [storedAction, spanIds] of actionIndex.entries()) {
      const lowerStored = storedAction.toLowerCase()
      
      // Check similarity (simple substring or Levenshtein-like)
      if (lowerStored.includes(lowerAction) || 
          lowerAction.includes(lowerStored) ||
          this.levenshteinSimilarity(lowerAction, lowerStored) > 0.7) {
        for (const id of spanIds) {
          allMatches.add(id)
        }
      }
    }
    
    const result = Array.from(allMatches)
    
    // If ids provided, return intersection
    if (ids !== null) {
      const idSet = new Set(ids)
      return result.filter(id => idSet.has(id))
    }
    
    return result
  }
  
  /**
   * Filter spans by multiple tags (OR logic)
   * 
   * @param ids - Initial set of span IDs (optional)
   * @param tags - Array of tags to match
   * @returns Span IDs matching any of the tags
   */
  filterByTags(ids: string[] | null, tags: string[]): string[] {
    const matches = new Set<string>()
    
    for (const tag of tags) {
      const tagMatches = this.find('tag', tag)
      for (const id of tagMatches) {
        matches.add(id)
      }
    }
    
    const result = Array.from(matches)
    
    // If ids provided, return intersection
    if (ids !== null) {
      const idSet = new Set(ids)
      return result.filter(id => idSet.has(id))
    }
    
    return result
  }
  
  /**
   * Filter spans by domain
   * 
   * @param ids - Initial set of span IDs (optional)
   * @param domain - Domain string
   * @returns Filtered span IDs
   */
  filterByDomain(ids: string[] | null, domain: string): string[] {
    const matches = this.find('domain', domain)
    
    if (ids !== null) {
      const idSet = new Set(ids)
      return matches.filter(id => idSet.has(id))
    }
    
    return matches
  }
  
  /**
   * Find spans matching multiple filters (AND logic)
   * 
   * @param filters - Map of field -> value pairs
   * @returns Span IDs matching all filters
   */
  findAll(filters: Record<string, string>): string[] {
    let results: Set<string> | null = null
    
    for (const [field, value] of Object.entries(filters)) {
      const matches = new Set(this.find(field, value))
      
      if (results === null) {
        results = matches
      } else {
        // Intersection: keep only IDs that exist in both sets
        const intersection = new Set<string>()
        for (const id of results) {
          if (matches.has(id)) {
            intersection.add(id)
          }
        }
        results = intersection
      }
    }
    
    return results ? Array.from(results) : []
  }
  
  /**
   * Get all unique values for a field
   * 
   * @param field - Field name
   * @returns Array of unique values
   */
  getFieldValues(field: string): string[] {
    const fieldIndex = this.indices.get(field)
    if (!fieldIndex) {
      return []
    }
    
    return Array.from(fieldIndex.keys())
  }
  
  /**
   * Get count of spans for a field value
   * 
   * @param field - Field name
   * @param value - Field value
   * @returns Number of spans with this field value
   */
  getCount(field: string, value: string): number {
    return this.find(field, value).length
  }
  
  /**
   * Simple Levenshtein-based similarity (0-1 scale)
   */
  private levenshteinSimilarity(a: string, b: string): number {
    const distance = this.levenshteinDistance(a, b)
    const maxLen = Math.max(a.length, b.length)
    return maxLen === 0 ? 1 : 1 - distance / maxLen
  }
  
  /**
   * Levenshtein distance (edit distance)
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[b.length][a.length]
  }
}
