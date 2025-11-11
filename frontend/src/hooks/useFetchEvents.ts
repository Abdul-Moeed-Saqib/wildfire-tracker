import { useCallback, useEffect, useState } from 'react';
import type { EonetEvent } from '../types/eonet';
import { fetchWildfireEvents, fetchEventGeoJSON } from '../services/nasaEonet';

type Options = {
  status?: 'open'|'closed'|'all';
  limit?: number;
  limitDetailFetch?: number;
  cacheTTL?: number; 
  cacheKey?: string;
};

const DEFAULT_CACHE_TTL = 1000 * 60 * 10; 
const DEFAULT_RETRY = 3;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useFetchEvents(options?: Options) {
  const [events, setEvents] = useState<EonetEvent[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = options?.cacheKey ?? 'eonet_events_cache';
  const cacheTTL = options?.cacheTTL ?? DEFAULT_CACHE_TTL;

  const readCache = useCallback((): EonetEvent[] | null => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.timestamp || !parsed?.data) return null;
      if ((Date.now() - parsed.timestamp) > cacheTTL) return null;
      return parsed.data as EonetEvent[];
    } catch {
      return null;
    }
  }, [cacheKey, cacheTTL]);

  const writeCache = useCallback((data: EonetEvent[]) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    } catch {
      // ignore
    }
  }, [cacheKey]);

  // fetch list with retries
  const fetchWithRetries = useCallback(async (attempts = DEFAULT_RETRY) => {
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const list = await fetchWildfireEvents({ status: options?.status ?? 'open', limit: options?.limit ?? 100 });
        return list;
      } catch (err: any) {
        lastErr = err;

        const status = err?.response?.status;
        const headers = err?.response?.headers || {};
        if (status === 429) {
          const ra = headers['retry-after'];
          let waitMs = 1000 * Math.pow(2, i); 
          if (ra) {
            const raFloat = parseFloat(ra);
            if (!Number.isNaN(raFloat)) {
              // numeric seconds
              waitMs = raFloat * 1000;
            } else {
              // date string
              const then = Date.parse(ra);
              if (!Number.isNaN(then)) {
                waitMs = Math.max(1000, then - Date.now());
              }
            }
          }
          const jitter = Math.floor(Math.random() * 500);
          await sleep(waitMs + jitter);
          continue; 
        }

        const backoff = 500 * Math.pow(2, i);
        const jitter = Math.floor(Math.random() * 400);
        await sleep(backoff + jitter);
      }
    }
    throw lastErr;
  }, [options?.status, options?.limit]);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    // show cached data immediately if available
    const cached = readCache();
    if (cached) setEvents(cached);

    try {
      const list = await fetchWithRetries(DEFAULT_RETRY);

      const missing = list.filter(e => !e.geometries || e.geometries.length === 0);
      const limitDetailFetch = options?.limitDetailFetch ?? 10; 
      const toFetch = missing.slice(0, limitDetailFetch);

      const idToGeoms = new Map<string, any[]>();
      let rateLimited = false;

      for (let i = 0; i < toFetch.length; i++) {
        const ev = toFetch[i];
        try {
          const detail = await fetchEventGeoJSON(ev.id);
          if (detail && Array.isArray(detail.geometries) && detail.geometries.length) {
            idToGeoms.set(ev.id, detail.geometries);
          }

          await sleep(150 + Math.floor(Math.random() * 200));
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 429) {
            rateLimited = true;
            break;
          }
        }
      }

      if (rateLimited) {
        setError(new Error('Rate limited by EONET (429). Try again later.'));
        setLoading(false);
        return { error: new Error('Rate limited') };
      }

      // merge geometries into list
      const merged = list.map(ev => {
        if ((!ev.geometries || ev.geometries.length === 0) && idToGeoms.has(ev.id)) {
          return Object.assign({}, ev, { geometries: idToGeoms.get(ev.id) });
        }
        return ev;
      });

      setEvents(merged);
      writeCache(merged);
      setLoading(false);
      setError(null);
      return { data: merged };

    } catch (err) {
      // network failed after retries
      setError(err as Error ?? new Error('Network error'));
      setLoading(false);
      return { error: err };
    }
  }, [fetchWithRetries, options?.limitDetailFetch, readCache, writeCache]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load(false);
    })();
    return () => { cancelled = true; };
  }, [load]);

  const refetch = useCallback(async (force = true) => {
    return await load(force);
  }, [load]);

  return { events, loading, error, refetch };
}


