import axios from 'axios';
import type { EonetEvent } from '../types/eonet';

export const EONET_BASE = 'https://eonet.gsfc.nasa.gov/api/v3';

// axios instance with timeout 
const axiosInstance = axios.create({
  baseURL: EONET_BASE,
  timeout: 10000, // 10 seconds
});


// Fetch wildfire events list
export async function fetchWildfireEvents(params?: {
  status?: 'open' | 'closed' | 'all';
  limit?: number;
}): Promise<EonetEvent[]> {
  const status = params?.status ?? 'open';
  const limit = params?.limit ?? 50;
  const url = `/events?status=${encodeURIComponent(status)}&category=wildfires&limit=${limit}`;
  const res = await axiosInstance.get(url);
  if (!res.data || !res.data.events) throw new Error('Unexpected EONET response');
  return res.data.events as EonetEvent[];
}

/**
 * Fetch event GeoJSON for a single event.
 * Returns an object with a geometries array .
 */
export async function fetchEventGeoJSON(eventId: string): Promise<{ geometries: any[] }> {
  const url = `/events/${encodeURIComponent(eventId)}/geojson`;
  const res = await axiosInstance.get(url);
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
