import axios from 'axios';
import type { EonetEvent } from '../types/eonet';

const EONET_BASE = 'https://eonet.gsfc.nasa.gov/api/v3';

export async function fetchWildfireEvents(params?: {
  status?: 'open' | 'closed' | 'all';
  limit?: number;
}): Promise<EonetEvent[]> {
  const status = params?.status ?? 'open';
  const limit = params?.limit ?? 50;
  const url = `${EONET_BASE}/events?status=${encodeURIComponent(status)}&category=wildfires&limit=${limit}`;
  const res = await axios.get(url);
  if (!res.data || !res.data.events) throw new Error('Unexpected EONET response');
  return res.data.events as EonetEvent[];
}

export async function fetchEventGeoJSON(eventId: string): Promise<{ geometries: any[] }> {
  const url = `${EONET_BASE}/events/${encodeURIComponent(eventId)}/geojson`;
  const res = await axios.get(url);
  if (!res || !res.data) return { geometries: [] };

  if (Array.isArray(res.data.features) && res.data.features.length) {
    const features = res.data.features;
    const geoms = features.map((f: any) => {
      const geom = f.geometry || null;
      return {
        date: f.properties?.date ?? null,
        type: geom?.type ?? null,
        coordinates: geom?.coordinates ?? null,
      };
    }).filter((g: any) => g.type && g.coordinates);
    return { geometries: geoms };
  }

  if (res.data.geometries && Array.isArray(res.data.geometries)) {
    return { geometries: res.data.geometries };
  }
  if (res.data.geometry) {
    return { geometries: [res.data.geometry] };
  }

  return { geometries: [] };
}
