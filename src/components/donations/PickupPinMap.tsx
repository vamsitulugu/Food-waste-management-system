import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { pickupIcon } from '../../utils/leafletSetup';

interface PickupPinMapProps {
  point: { latitude: number; longitude: number };
  onChange: (point: { latitude: number; longitude: number }) => void;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [map, lat, lng]);
  return null;
}

function TapToMove({ onChange }: Pick<PickupPinMapProps, 'onChange'>) {
  useMapEvents({
    click: (e) => onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });
  return null;
}

/** Shows the chosen pickup spot. The donor can drag the pin or tap the map to fine-tune it. */
export function PickupPinMap({ point, onChange }: PickupPinMapProps) {
  return (
    <div className="mt-1 overflow-hidden rounded-2xl border border-base-700">
      <div className="relative isolate z-0 h-48 w-full bg-base-800">
        <MapContainer
          center={[point.latitude, point.longitude]}
          zoom={16}
          scrollWheelZoom={false}
          className="h-full w-full"
          aria-label="Map showing the pickup location"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Marker
            position={[point.latitude, point.longitude]}
            icon={pickupIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                onChange({ latitude: ll.lat, longitude: ll.lng });
              },
            }}
          />
          <Recenter lat={point.latitude} lng={point.longitude} />
          <TapToMove onChange={onChange} />
        </MapContainer>
      </div>
      <p className="bg-base-850 px-3 py-2 text-xs text-ink-500">
        This pin is where the recipient is guided and tracked to. Drag it or tap the map to adjust.
      </p>
    </div>
  );
}
