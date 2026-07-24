import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with bundlers (Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
}

function LocationMarker({ onSelect, position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function LocationPicker({ onSelect, defaultCenter = [12.9716, 77.5946], value }) {
  const [position, setPosition] = useState(value || null);
  const [mapCenter, setMapCenter] = useState(value ? [value.lat, value.lng] : defaultCenter);

  useEffect(() => {
    if (value && value.lat && value.lng) {
      const parsedLat = parseFloat(value.lat);
      const parsedLng = parseFloat(value.lng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setPosition({ lat: parsedLat, lng: parsedLng });
        setMapCenter([parsedLat, parsedLng]);
        return;
      }
    }
    setPosition(null);
    setMapCenter(defaultCenter);
  }, [value, defaultCenter]);

  return (
    <div style={{ marginBottom: '16px' }}>
      <label className="form-label" style={{ marginBottom: '4px', display: 'block' }}>
        Pin-Drop Location on Map *
      </label>
      <span style={{ fontSize: '11px', color: 'var(--colors-muted)', display: 'block', marginBottom: '10px' }}>
        Click or tap on the map to mark your PG's exact physical coordinates.
      </span>
      <div style={{ height: '280px', width: '100%', borderRadius: 'var(--rounded-md)', overflow: 'hidden', border: '1px solid var(--colors-hairline)', position: 'relative', zIndex: 1 }}>
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ChangeView center={mapCenter} />
          <LocationMarker onSelect={onSelect} position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
      {position && (
        <span style={{ fontSize: '11px', color: 'var(--colors-success)', display: 'block', marginTop: '8px', fontWeight: 700 }}>
          ✓ Selected Coordinates: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </span>
      )}
    </div>
  );
}
