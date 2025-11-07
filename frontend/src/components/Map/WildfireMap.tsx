import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { EonetEvent } from '../../types/eonet';
import type { LatLngTuple } from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerUrl,
  shadowUrl: markerShadow,
});

type MappedEvent = {
  ev: EonetEvent;
  geoType: string | null;
  pos: LatLngTuple | null;              
  polygon?: LatLngTuple[][] | null;     
};

type Props = {
  events: EonetEvent[] | null;
  center?: LatLngTuple;
  zoom?: number;
};

function latestGeometry(e: EonetEvent) {
  return e.geometries && e.geometries.length ? e.geometries[e.geometries.length - 1] : null;
}

function pointToLatLng(coords: any): LatLngTuple | null {
  if (!coords || !Array.isArray(coords)) return null;
  if (coords.length >= 2) {
    const [lon, lat] = coords;
    return [lat, lon];
  }
  return null;
}

function polygonToLatLngRings(coords: any): LatLngTuple[][] | null {
  if (!coords || !Array.isArray(coords)) return null;

  let rings: any[] = [];

  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])) {
    rings = coords[0];
  } else if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    rings = coords;
  } else {
    return null;
  }


  const latRings: LatLngTuple[][] = rings.map((ring: any[]) =>
    ring.map((pt: any[]) => {
      const [lon, lat] = pt;
      return [lat, lon];
    })
  );

  return latRings;
}

function centroidOfRing(ring: any[]): LatLngTuple | null {
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let sumLon = 0, sumLat = 0, count = 0;
  ring.forEach((pt: any[]) => {
    if (Array.isArray(pt) && pt.length >= 2) {
      sumLon += pt[0];
      sumLat += pt[1];
      count++;
    }
  });
  if (count === 0) return null;
  return [sumLat / count, sumLon / count];
}

export default function WildfireMap({ events, center = [20, 0], zoom = 2 }: Props) {
  const mapped: MappedEvent[] = useMemo(() => {
    if (!events) return [];
    return events.map(ev => {
      const geo = latestGeometry(ev);
      if (!geo) return { ev, geoType: null, pos: null, polygon: null };

      if (geo.type === 'Point') {
        const pos = pointToLatLng(geo.coordinates);
        return { ev, geoType: 'Point', pos, polygon: null };
      }

      if (geo.type === 'Polygon' || geo.type === 'MultiPolygon') {
        const rings = polygonToLatLngRings(geo.coordinates);
        const pos = (rings && rings[0]) ? centroidOfRing(rings[0].map(p => [p[1], p[0]])) : null;
    
        let centroid: LatLngTuple | null = null;
        if (rings && rings[0]) {
          const ring = rings[0];
          let sumLat = 0, sumLon = 0;
          ring.forEach(pt => { sumLat += pt[0]; sumLon += pt[1]; });
          centroid = [sumLat / ring.length, sumLon / ring.length];
        }
        return { ev, geoType: geo.type, pos: centroid, polygon: rings ?? null };
      }

      const fallbackPos = pointToLatLng(geo.coordinates);
      return { ev, geoType: geo.type ?? null, pos: fallbackPos, polygon: null };
    });
  }, [events]);

  console.debug('EONET events total:', events?.length ?? 0);
  console.debug('Mapped events (with pos):', mapped.filter(m => m.pos).length);
  console.debug('Mapped sample:', mapped.slice(0, 20).map(m => ({ id: m.ev.id, geoType: m.geoType, pos: m.pos != null })));

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden shadow">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapped.map(({ ev, geoType, pos, polygon }) => {
          if (!pos && !polygon) return null;

          // render polygon overlay if available
          return (
            <React.Fragment key={ev.id}>
              {polygon && polygon.length > 0 && (
                polygon.map((ring, idx) => (
                  <Polygon key={ev.id + '-poly-' + idx} positions={ring} pathOptions={{ color: '#ff4500', weight: 1, fillOpacity: 0.1 }} />
                ))
              )}

              {pos && (
                <>
                  <CircleMarker center={pos} radius={8} pathOptions={{ color: '#d00000', fillColor: '#ff8c00', fillOpacity: 0.9 }}>
                    <Popup>
                      <div style={{ maxWidth: 260 }}>
                        <h3 style={{ fontWeight: 600 }}>{ev.title}</h3>
                        <p style={{ fontSize: 12, color: '#555' }}>{latestGeometry(ev)?.date}</p>
                        <p style={{ fontSize: 12, marginTop: 4 }}>geom: {geoType}</p>
                        <div style={{ marginTop: 6 }}>
                          {ev.sources?.map((s, idx) => s.url ? <div key={idx}><a href={s.url} target="_blank" rel="noreferrer">{s.url}</a></div> : null)}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>

                  <Marker position={pos}>
                    <Popup>
                      <div style={{ maxWidth: 220 }}>
                        <strong>{ev.title}</strong>
                        <div style={{ fontSize: 12 }}>{latestGeometry(ev)?.date}</div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>{geoType}</div>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
