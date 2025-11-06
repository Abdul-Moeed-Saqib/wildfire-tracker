import axios from 'axios';
import type { EonetEvent } from '../types/eonet';

const EONET_BASE = 'https://eonet.gsfc.nasa.gov/api/v3';

export async function fetchWildfireEvents(params?: {
  status?: 'open' | 'closed' | 'all';
  limit?: number;
}) : Promise<EonetEvent[]> {
  const status = params?.status ?? 'open';
  const limit = params?.limit ?? 50;

  const url = `${EONET_BASE}/events?status=${encodeURIComponent(status)}&category=wildfires&limit=${limit}`;

  const res = await axios.get(url);
  if (!res.data || !res.data.events) {
    throw new Error('Unexpected EONET response');
  }
  return res.data.events as EonetEvent[];
}