import { NewsArticle } from '@/lib/types/news';
import { formatDateForAPI } from '@/lib/utils/date-utils';

// Client-side cache interface
interface CacheEntry {
  date: string;
  articles: NewsArticle[];
  timestamp: number;
  timezone: string;
  cached: boolean;
  expiresAt: number;
}

interface CacheMetadata {
  totalEntries: number;
  oldestEntry: number;
  newestEntry: number;
  cacheSize: number; // in bytes (approximate)
}

class NewsCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_PREFIX = 'news_cache_';
  private readonly MAX_CACHE_ENTRIES = 50; // Limit cache size
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly LOCAL_STORAGE_KEY = 'daily_news_cache';

  constructor() {
    // Only load from localStorage on the client side
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
    }
    this.cleanupExpiredEntries();
  }

  // Generate cache key
  private getCacheKey(date: Date, timezone: string): string {
    const dateStr = formatDateForAPI(date);
    return `${this.CACHE_PREFIX}${dateStr}_${timezone}`;
  }

  // Check if cache entry is valid
  private isValidEntry(entry: CacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  // Store articles in cache
  async cacheNews(date: Date, timezone: string, articles: NewsArticle[], fromServer: boolean = false): Promise<void> {
    const key = this.getCacheKey(date, timezone);
    const now = Date.now();
    
    const entry: CacheEntry = {
      date: formatDateForAPI(date),
      articles,
      timestamp: now,
      timezone,
      cached: !fromServer, // If from server, it's fresh; if from cache, it's cached
      expiresAt: now + this.CACHE_DURATION,
    };

    this.cache.set(key, entry);
    
    // Cleanup old entries if cache is too large
    if (this.cache.size > this.MAX_CACHE_ENTRIES) {
      this.evictOldestEntries();
    }

    // Persist to localStorage
    this.saveToLocalStorage();
  }

  // Retrieve articles from cache
  async getCachedNews(date: Date, timezone: string): Promise<{ articles: NewsArticle[]; cached: boolean } | null> {
    const key = this.getCacheKey(date, timezone);
    const entry = this.cache.get(key);

    if (!entry || !this.isValidEntry(entry)) {
      // Remove expired entry
      if (entry) {
        this.cache.delete(key);
        this.saveToLocalStorage();
      }
      return null;
    }

    return {
      articles: entry.articles,
      cached: true, // Always true when retrieved from cache
    };
  }

  // Check if date has cached news
  hasNewsForDate(date: Date, timezone: string): boolean {
    const key = this.getCacheKey(date, timezone);
    const entry = this.cache.get(key);
    return entry ? this.isValidEntry(entry) && entry.articles.length > 0 : false;
  }

  // Get all dates with cached news
  getAvailableDates(timezone: string): Date[] {
    const dates: Date[] = [];
    
    for (const [, entry] of this.cache.entries()) {
      if (entry.timezone === timezone && this.isValidEntry(entry) && entry.articles.length > 0) {
        dates.push(new Date(entry.date));
      }
    }

    return dates.sort((a, b) => b.getTime() - a.getTime());
  }

  // Clear cache for specific date
  clearDateCache(date: Date, timezone: string): void {
    const key = this.getCacheKey(date, timezone);
    this.cache.delete(key);
    this.saveToLocalStorage();
  }

  // Clear all cache
  clearAllCache(): void {
    this.cache.clear();
    localStorage.removeItem(this.LOCAL_STORAGE_KEY);
  }

  // Get cache statistics
  getCacheStats(): CacheMetadata {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      totalEntries: this.cache.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      cacheSize: this.estimateCacheSize(),
    };
  }

  // Estimate cache size in bytes
  private estimateCacheSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      // Rough estimation
      size += JSON.stringify(entry).length * 2; // UTF-16 uses 2 bytes per character
    }
    return size;
  }

  // Cleanup expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.saveToLocalStorage();
    }
  }

  // Evict oldest entries to maintain cache size
  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.saveToLocalStorage();
  }

  // Load cache from localStorage
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, entry] of Object.entries(data)) {
          this.cache.set(key, entry as CacheEntry);
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      // Clear corrupted cache
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    }
  }

  // Save cache to localStorage
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
      
      // If quota exceeded, clear some old entries and try again
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.evictOldestEntries();
        try {
          const data = Object.fromEntries(this.cache);
          localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch (retryError) {
          console.error('Failed to save cache after cleanup:', retryError);
        }
      }
    }
  }

  // Preload news for nearby dates (performance optimization)
  async preloadNearbyDates(currentDate: Date, timezone: string): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Preload yesterday and tomorrow if not in cache
    for (const offset of [-1, 1]) {
      const targetDate = new Date(currentDate);
      targetDate.setDate(currentDate.getDate() + offset);
      
      if (!this.hasNewsForDate(targetDate, timezone)) {
        // This would trigger a background fetch (implement based on your API structure)
        promises.push(this.backgroundFetchNews(targetDate));
      }
    }

    await Promise.allSettled(promises);
  }

  // Background fetch for preloading (would need API integration)
  private async backgroundFetchNews(date: Date): Promise<void> {
    // This is a placeholder - would integrate with your news API
    // Could be implemented as a low-priority background fetch
    try {
      // Implementation would go here
      console.log(`Background preload for ${formatDateForAPI(date)} not implemented yet`);
    } catch (error) {
      console.warn(`Background fetch failed for ${formatDateForAPI(date)}:`, error);
    }
  }
}

// Singleton instance
export const newsCacheService = new NewsCacheService();

// Hook for using cache service in React components
export function useNewsCache() {
  return {
    cacheNews: newsCacheService.cacheNews.bind(newsCacheService),
    getCachedNews: newsCacheService.getCachedNews.bind(newsCacheService),
    hasNewsForDate: newsCacheService.hasNewsForDate.bind(newsCacheService),
    getAvailableDates: newsCacheService.getAvailableDates.bind(newsCacheService),
    clearDateCache: newsCacheService.clearDateCache.bind(newsCacheService),
    clearAllCache: newsCacheService.clearAllCache.bind(newsCacheService),
    getCacheStats: newsCacheService.getCacheStats.bind(newsCacheService),
    preloadNearbyDates: newsCacheService.preloadNearbyDates.bind(newsCacheService),
  };
}