import { useEffect, useState } from 'react';
import type { EonetEvent } from '../types/eonet';
import { fetchWildfireEvents, fetchEventGeoJSON } from '../services/nasaEonet';

export function useFetchEvents(options?: { status?: 'open'|'closed'|'all'; limit?: number; limitDetailFetch?: number }) {
  const [events, setEvents] = useState<EonetEvent[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let canceled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchWildfireEvents(options);
        if (canceled) return;

        const missing = list.filter(e => !e.geometries || e.geometries.length === 0);

        const limitDetailFetch = options?.limitDetailFetch ?? 30;
        const toFetch = missing.slice(0, limitDetailFetch);

        if (toFetch.length) {
          const detailPromises = toFetch.map(e => fetchEventGeoJSON(e.id).catch(() => ({ geometries: [] })));
          const details = await Promise.all(detailPromises);
          if (canceled) return;

          // Merge geometries into the original list items
          const idToGeoms = new Map<string, any[]>();
          toFetch.forEach((ev, idx) => {
            const result = details[idx];
            if (result && Array.isArray(result.geometries) && result.geometries.length) {
              idToGeoms.set(ev.id, result.geometries);
            }
          });

          const merged = list.map(ev => {
            if ((!ev.geometries || ev.geometries.length === 0) && idToGeoms.has(ev.id)) {
              return Object.assign({}, ev, { geometries: idToGeoms.get(ev.id) });
            }
            return ev;
          });

          if (!canceled) setEvents(merged);
        } else {
          if (!canceled) setEvents(list);
        }
      } catch (err) {
        if (!canceled) setError(err as Error ?? new Error('Unknown error'));
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    load();
    return () => { canceled = true; };
  }, [options?.status, options?.limit, options?.limitDetailFetch]);

  return { events, loading, error };
}
