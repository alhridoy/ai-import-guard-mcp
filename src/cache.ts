import { CacheEntry, CacheOptions } from './types.js';

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private options: CacheOptions;

  constructor(options: CacheOptions) {
    this.options = options;
    
    // Clean up expired entries periodically
    setInterval(() => {
      this.cleanup();
    }, this.options.ttl / 2);
  }

  /**
   * Get a cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, customTtl?: number): void {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.options.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: customTtl ?? this.options.ttl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if a key exists in cache and hasn't expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: 0, // TODO: Implement hit rate tracking
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Estimate memory usage of the cache (rough approximation)
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + JSON string size of data
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 24; // Approximate overhead for timestamp, ttl, etc.
    }

    return totalSize;
  }

  /**
   * Generate a cache key from multiple parameters
   */
  static generateKey(...parts: (string | number | boolean | undefined)[]): string {
    return parts
      .filter(part => part !== undefined)
      .map(part => String(part))
      .join(':');
  }
}
