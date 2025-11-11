import React, { useMemo, useRef, useState, useEffect } from 'react';
import WildfireMap from '../components/Map/WildfireMap';
import EventsSidebar from '../components/Events/EventsSidebar';
import { useFetchEvents } from '../hooks/useFetchEvents';
import type { EonetEvent } from '../types/eonet';
import type L from 'leaflet';

export default function Home() {
  // caching: we pass limitDetailFetch to fetch geometry for more events if needed
  const { events, loading, error, refetch } = useFetchEvents({ status: 'open', limit: 50, limitDetailFetch: 10, cacheTTL: 1000 * 60 * 10 });
  
  // UI filter state
  const [statusFilter, setStatusFilter] = useState<'open'|'closed'|'all'>('open');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  // selected event id for highlight (not used to auto-open popups here)
  const [selectedEvent, setSelectedEvent] = useState<EonetEvent | null>(null);

  // map ref to call flyTo
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // expose events for console debugging (temporary)
    (window as any).__WILDFIRE_EVENTS__ = events;
  }, [events]);

  // when a user selects an event from the sidebar
  function handleSelectEvent(ev: EonetEvent) {
    setSelectedEvent(ev);
    // compute position (use last geometry)
    const g = ev.geometries && ev.geometries.length ? ev.geometries[ev.geometries.length - 1] : null;
    if (!g) return;
    if (g.type === 'Point' && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
      const lon = g.coordinates[0];
      const lat = g.coordinates[1];
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lon], 6, { duration: 0.8 });
      }
    } else if ((g.type === 'Polygon' || g.type === 'MultiPolygon') && Array.isArray(g.coordinates)) {
      // compute centroid of first ring (simple average)
      let ring = g.coordinates;
      if (Array.isArray(g.coordinates[0]) && Array.isArray(g.coordinates[0][0]) && Array.isArray(g.coordinates[0][0][0])) {
        // MultiPolygon -> use first polygon
        ring = g.coordinates[0][0];
      } else if (Array.isArray(g.coordinates[0]) && Array.isArray(g.coordinates[0][0])) {
        // Polygon -> first ring
        ring = g.coordinates[0];
      }
      if (Array.isArray(ring) && ring.length) {
        let sumLon = 0, sumLat = 0;
        let cnt = 0;
        for (const p of ring) {
          if (Array.isArray(p) && p.length >= 2) {
            sumLon += p[0];
            sumLat += p[1];
            cnt++;
          }
        }
        if (cnt > 0 && mapRef.current) {
          const centroidLat = sumLat / cnt;
          const centroidLon = sumLon / cnt;
          mapRef.current.flyTo([centroidLat, centroidLon], 6, { duration: 0.8 });
        }
      }
    }
  }

  function handleRefresh() {
    // trigger refetch (force)
    refetch(true);
  }

  return (
    <div className="p-4 max-w-full mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Wildfire Tracker</h1>
        <p className="text-sm text-gray-600">Live events from NASA EONET (wildfires)</p>
      </header>

      {error && (
        <div className="mb-2">
          <div className="bg-yellow-100 border-l-4 border-yellow-400 p-3 text-sm">
            <strong className="text-yellow-800">Network issue:</strong> Unable to update from NASA right now — showing cached data (if available).
            <div className="mt-1 text-xs text-gray-600">Error: {error.message}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,320px)_1fr] gap-4 items-start">
        <EventsSidebar
          events={events}
          loading={loading}
          onSelectEvent={handleSelectEvent}
          onRefresh={handleRefresh}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
          search={search}
          setSearch={setSearch}
        />

        <div>
          <WildfireMap events={events} mapRef={mapRef} zoom={2} center={[20,0]} selectedEventId={selectedEvent?.id ?? null} />
          <section className="mt-4">
            <h2 className="font-semibold">Event count</h2>
            <p>{events ? events.length : 0} wildfire events</p>
          </section>
        </div>
      </div>
    </div>
  );
}
