'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCache, CACHE_TTL, CacheOptions } from '@/lib/cache';

export interface UseCachedDataOptions extends CacheOptions {
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (err: any) => void;
}

export interface UseCachedDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: (forceRefresh?: boolean) => Promise<T | null>;
  mutate: (newData: T | ((prev: T | null) => T)) => void;
}

/**
 * Custom React hook for seamless client-side data fetching with caching,
 * request deduplication, optimistic mutation, and SWR support.
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedDataOptions = {}
): UseCachedDataReturn<T> {
  const {
    ttl = CACHE_TTL.STATIC,
    tag,
    forceRefresh = false,
    swr = true,
    persist = false,
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(() => apiCache.get<T>(key, swr));
  const [isLoading, setIsLoading] = useState<boolean>(() => !apiCache.has(key) && enabled);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(
    async (force = false): Promise<T | null> => {
      if (!enabled) return null;

      const hasCached = apiCache.has(key);
      if (hasCached && !force) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await apiCache.fetchWithCache(
          key,
          () => fetcherRef.current(),
          { ttl, tag, forceRefresh: force, swr, persist }
        );
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err: any) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        onError?.(errorObj);
        return null;
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [key, ttl, tag, swr, persist, enabled, onSuccess, onError]
  );

  useEffect(() => {
    execute(forceRefresh);
  }, [execute, forceRefresh]);

  const mutate = useCallback(
    (updater: T | ((prev: T | null) => T)) => {
      const updated = apiCache.mutate(key, updater, ttl, tag);
      setData(updated);
    },
    [key, ttl, tag]
  );

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch: execute,
    mutate,
  };
}
