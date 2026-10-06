/**
 * Frontend Cache Management Layer
 * High-performance client-side caching engine featuring:
 * - TTL-based expiration with customizable per-resource lifetimes
 * - Concurrency request deduplication (in-flight promise sharing)
 * - Multi-tier invalidation (by key, tag, multi-tag, or prefix)
 * - LRU (Least-Recently-Used) cache eviction with bounded capacity
 * - Stale-While-Revalidate (SWR) support for instantaneous render
 * - Direct mutation & optimistic update helpers
 * - Optional browser storage persistence for static metadata
 * - Real-time cache performance metrics & diagnostics
 */

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tag?: string;
  createdAt: number;
}

export interface CacheOptions {
  ttl?: number;
  tag?: string;
  forceRefresh?: boolean;
  swr?: boolean;
  persist?: boolean;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  inFlightCount: number;
  hits: number;
  misses: number;
  hitRatio: string;
  tags: string[];
  keys: string[];
}

export const CACHE_TTL = {
  STATIC: 5 * 60 * 1000,       // 5 minutes: Categories, Priorities, Roles, Permissions, SLA Policies
  USERS: 60 * 1000,            // 1 minute: User lists, User profile
  TICKETS: 25 * 1000,          // 25 seconds: Paginated tickets list, ticket details, assignments, notes, comments
  METRICS: 30 * 1000,          // 30 seconds: Dashboard metrics
  NOTIFICATIONS: 15 * 1000,    // 15 seconds: Notification items & unread count
};

const PERSISTENCE_PREFIX = 'helpdesk_cache_';

export class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private hits = 0;
  private misses = 0;
  private maxSize: number;

  constructor(maxSize = 250) {
    this.maxSize = maxSize;

    // Periodic automatic sweep to prune expired entries every 60 seconds
    if (typeof window !== 'undefined') {
      const sweepTimer = setInterval(() => {
        this.pruneExpired();
      }, 60000);

      // Clean up timer if window unloads
      if (typeof window.addEventListener === 'function') {
        window.addEventListener('beforeunload', () => {
          clearInterval(sweepTimer);
        });
      }
    }
  }

  /**
   * Retrieves an item from memory cache or session persistence.
   * Updates LRU access ordering.
   */
  get<T>(key: string, allowStale = false): T | null {
    const entry = this.cache.get(key);

    if (entry) {
      const isExpired = Date.now() > entry.expiresAt;
      if (isExpired && !allowStale) {
        this.delete(key);
        this.misses++;
        return null;
      }

      // LRU refresh: re-insert key to mark as most recently used
      this.cache.delete(key);
      this.cache.set(key, entry);

      this.hits++;
      return entry.data as T;
    }

    // Check optional sessionStorage persistence if running in browser
    if (typeof window !== 'undefined') {
      try {
        const persistedRaw = sessionStorage.getItem(`${PERSISTENCE_PREFIX}${key}`);
        if (persistedRaw) {
          const persistedEntry: CacheEntry<T> = JSON.parse(persistedRaw);
          const isExpired = Date.now() > persistedEntry.expiresAt;
          if (isExpired && !allowStale) {
            sessionStorage.removeItem(`${PERSISTENCE_PREFIX}${key}`);
            this.misses++;
            return null;
          }
          // Restore back into memory cache
          this.set(key, persistedEntry.data, Math.max(1000, persistedEntry.expiresAt - Date.now()), persistedEntry.tag);
          this.hits++;
          return persistedEntry.data;
        }
      } catch {
        // Fallback gracefully on storage quota or parsing errors
      }
    }

    this.misses++;
    return null;
  }

  /**
   * Checks whether a key is present and currently unexpired.
   */
  has(key: string, allowExpired = false): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (!allowExpired && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Returns remaining TTL in milliseconds, or 0 if expired/not found.
   */
  getRemainingTTL(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) return 0;
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Stores an item with a specified expiration time (in ms) and an optional tag for group invalidation.
   * Evicts the least recently used item if cache exceeds maxSize.
   */
  set<T>(key: string, data: T, ttlMs: number, tag?: string, persist = false): void {
    // Evict oldest item if capacity exceeded
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
      tag,
      createdAt: Date.now(),
    };

    this.cache.set(key, entry);

    // Optional sessionStorage persistence for offline resilience
    if (persist && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`${PERSISTENCE_PREFIX}${key}`, JSON.stringify(entry));
      } catch {
        // Ignore quota limits
      }
    }
  }

  /**
   * Directly mutate or update cached data optimistically.
   */
  mutate<T>(
    key: string,
    updater: T | ((current: T | null) => T),
    ttlMs = CACHE_TTL.TICKETS,
    tag?: string
  ): T {
    const current = this.get<T>(key, true);
    const updatedData = typeof updater === 'function' ? (updater as (c: T | null) => T)(current) : updater;
    const existingEntry = this.cache.get(key);
    const resolvedTag = tag || existingEntry?.tag;
    this.set(key, updatedData, ttlMs, resolvedTag);
    return updatedData;
  }

  /**
   * Deduplicates concurrent in-flight requests and caches the resolved data.
   * Supports Stale-While-Revalidate (SWR) for instant UI rendering.
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlOrOptions: number | CacheOptions,
    tagParam?: string,
    forceRefreshParam = false
  ): Promise<T> {
    const options: CacheOptions = typeof ttlOrOptions === 'number'
      ? { ttl: ttlOrOptions, tag: tagParam, forceRefresh: forceRefreshParam }
      : ttlOrOptions;

    const ttl = options.ttl ?? CACHE_TTL.STATIC;
    const tag = options.tag;
    const forceRefresh = options.forceRefresh ?? false;
    const swr = options.swr ?? false;
    const persist = options.persist ?? false;

    // Check cache first if not explicitly forcing a refresh
    if (!forceRefresh) {
      const cached = this.get<T>(key, swr);
      if (cached !== null) {
        // If entry is still fresh or not using SWR, return immediately
        const entry = this.cache.get(key);
        const isFresh = entry && Date.now() <= entry.expiresAt;
        if (isFresh || !swr) {
          return cached;
        }

        // Stale-While-Revalidate: Return stale data now, trigger silent background revalidation
        this.backgroundRevalidate(key, fetcher, ttl, tag, persist);
        return cached;
      }
    }

    // Share identical pending request promise to prevent duplicate network roundtrips
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    const promise = fetcher()
      .then((data) => {
        this.set(key, data, ttl, tag, persist);
        return data;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Internal SWR helper: Triggers silent background revalidation without blocking caller.
   */
  private backgroundRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
    tag?: string,
    persist = false
  ): void {
    if (this.inFlight.has(key)) return;

    const promise = fetcher()
      .then((data) => {
        this.set(key, data, ttlMs, tag, persist);
        return data;
      })
      .catch(() => {
        // On background refresh failure, keep existing cached entry
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
  }

  /**
   * Invalidate and remove a single specific cache key.
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.inFlight.delete(key);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`${PERSISTENCE_PREFIX}${key}`);
      } catch {}
    }
    return deleted;
  }

  /**
   * Invalidate a single specific cache key (alias for delete).
   */
  invalidateKey(key: string): boolean {
    return this.delete(key);
  }

  /**
   * Invalidate all cached items matching a specific tag (e.g. 'tickets', 'categories').
   */
  invalidateTag(tag: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tag === tag) {
        this.delete(key);
      }
    }
  }

  /**
   * Invalidate multiple tags simultaneously.
   */
  invalidateTags(tags: string[]): void {
    tags.forEach((t) => this.invalidateTag(t));
  }

  /**
   * Invalidate all keys matching a given prefix (e.g. 'tickets:paginated').
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    }
  }

  /**
   * Prune all expired entries from memory. Returns number of purged items.
   */
  pruneExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear the entire cache, in-flight requests, and persistent storage.
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.hits = 0;
    this.misses = 0;

    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(PERSISTENCE_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {}
    }
  }

  /**
   * Returns current cache diagnostics & performance metrics.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const uniqueTags = Array.from(
      new Set(
        Array.from(this.cache.values())
          .map((e) => e.tag)
          .filter(Boolean)
      )
    ) as string[];

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      inFlightCount: this.inFlight.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0.0%',
      tags: uniqueTags,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const apiCache = new ApiCache(250);

// Attach cache to window in browser for dev inspection
if (typeof window !== 'undefined') {
  (window as any).__helpdeskCache = apiCache;
}
