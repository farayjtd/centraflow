'use client';

import { useEffect, useRef } from 'react';

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
};

export function MapPicker({ lat, lng, onChange, height = 300 }: Props) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mapRef.current) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const defaultLat = lat ?? -6.2088;
      const defaultLng = lng ?? 106.8456;

      const map = L.default.map(containerRef.current).setView([defaultLat, defaultLng], 13);

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Fix default icon
      const icon = L.default.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      if (lat && lng) {
        markerRef.current = L.default.marker([lat, lng], { icon }).addTo(map);
      }

      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          markerRef.current = L.default.marker([clickLat, clickLng], { icon }).addTo(map);
        }
        onChange(clickLat, clickLng);
      });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
        Lokasi (klik peta untuk menandai)
      </label>
      <div
        ref={containerRef}
        style={{
          height: `${height}px`,
          width: '100%',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          zIndex: 0,
        }}
      />
      {lat && lng && (
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
          Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}