import { useMemo, useState } from 'react';
import type { EonetEvent } from '../../types/eonet';

type Props = {
  events: EonetEvent[] | null;
  loading: boolean;
  onSelectEvent: (ev: EonetEvent) => void;
  onRefresh: () => void;
  statusFilter: 'open'|'closed'|'all';
  setStatusFilter: (s: 'open'|'closed'|'all') => void;
  dateFrom?: string | null;
  dateTo?: string | null;
  setDateFrom: (d: string | null) => void;
  setDateTo: (d: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
};

function latestGeometry(e: EonetEvent) {
  return e.geometries && e.geometries.length ? e.geometries[e.geometries.length - 1] : null;
}

export default function EventsSidebar({
  events,
  loading,
  onSelectEvent,
  onRefresh,
  statusFilter,
  setStatusFilter,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  search,
  setSearch
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const filtered = useMemo(() => {
    if (!events) return [];
    return events.filter(e => {
      if (statusFilter && statusFilter !== 'all') {
        const isClosed = !!e.closed;
        if (statusFilter === 'open' && isClosed) return false;
        if (statusFilter === 'closed' && !isClosed) return false;
      }
      const g = latestGeometry(e);
      if (dateFrom && g && new Date(g.date) < new Date(dateFrom)) return false;
      if (dateTo && g && new Date(g.date) > new Date(dateTo + 'T23:59:59')) return false;

      if (search && search.trim().length > 0) {
        const s = search.trim().toLowerCase();
        if (!e.title.toLowerCase().includes(s)) return false;
      }
      return true;
    }).sort((a,b) => {
      // sort by latest geometry date descending (newest first)
      const aG = latestGeometry(a);
      const bG = latestGeometry(b);
      const aD = aG ? new Date(aG.date).getTime() : 0;
      const bD = bG ? new Date(bG.date).getTime() : 0;
      return bD - aD;
    });
  }, [events, statusFilter, dateFrom, dateTo, search]);

  return (
    <aside className={`bg-white border rounded p-3 shadow-sm ${expanded ? 'w-80' : 'w-12'} transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold">Events</h2>
          <p className="text-xs text-gray-500">{events ? `${events.length} total` : '---'}</p>
        </div>

        <div className="flex items-center space-x-1">
          <button
            title="Refresh"
            onClick={() => onRefresh()}
            className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
          >
            Refresh
          </button>
          <button title={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded(!expanded)} className="ml-1 p-1">
            {expanded ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="mb-2">
            <label className="block text-xs text-gray-600">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="mt-1 w-full border rounded px-2 py-1 text-sm">
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600">From</label>
              <input type="date" value={dateFrom || ''} onChange={(e) => setDateFrom(e.target.value || null)} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600">To</label>
              <input type="date" value={dateTo || ''} onChange={(e) => setDateTo(e.target.value || null)} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs text-gray-600">Search</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title..." className="mt-1 w-full border rounded px-2 py-1 text-sm" />
          </div>

          <div className="mb-2 text-xs text-gray-500">Showing <strong>{filtered.length}</strong> results</div>

          <div className="max-h-[55vh] overflow-auto divide-y">
            {loading && <div className="p-2 text-sm text-gray-500">Loading...</div>}
            {!loading && filtered.length === 0 && <div className="p-2 text-sm text-gray-500">No results</div>}

            {filtered.map(ev => {
              const g = latestGeometry(ev);
              const date = g?.date ? new Date(g.date).toLocaleString() : '—';
              return (
                <div key={ev.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => onSelectEvent(ev)}>
                  <div className="text-sm font-medium">{ev.title}</div>
                  <div className="text-xs text-gray-500">{date}</div>
                  <div className="text-xs mt-1 text-gray-600">{ev.sources?.[0]?.url ?? ''}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
