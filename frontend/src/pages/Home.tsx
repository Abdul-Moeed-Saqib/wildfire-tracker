import React, { useMemo, useRef, useState, useEffect } from 'react';
import WildfireMap from '../components/Map/WildfireMap';
import EventsSidebar from '../components/Events/EventsSidebar';
import { useFetchEvents } from '../hooks/useFetchEvents';
import type { EonetEvent } from '../types/eonet';
import type L from 'leaflet';

export default function Home() {
  const { events, loading, error, refetch } = useFetchEvents({ status: 'open', limit: 50, limitDetailFetch: 10, cacheTTL: 1000 * 60 * 10 });
  
  const [statusFilter, setStatusFilter] = useState<'open'|'closed'|'all'>('open');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<EonetEvent | null>(null);

  // calls flyto
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    (window as any).__WILDFIRE_EVENTS__ = events;
  }, [events]);

  // when a user selects an event from the sidebar
  function handleSelectEvent(ev: EonetEvent) {
  setSelectedEvent(ev);
}

  function handleRefresh() {
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
