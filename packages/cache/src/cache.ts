/**
 * LRU Cache with TTL
 */

interface CacheEntry<T> {
  value: T
  expiry: number
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private maxSize: number
  private ttl: number
  
  constructor(maxSize: number = 1000, ttl: number = 3600000) {
    this.maxSize = maxSize
    this.ttl = ttl
  }
  
  set(key: string, value: T): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    })
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    // Move to end (LRU)
    this.cache.delete(key)
    this.cache.set(key, entry)
    
    return entry.value
  }
  
  has(key: string): boolean {
    return this.get(key) !== null
  }
  
  clear(): void {
    this.cache.clear()
  }
}
