import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Vite does not resolve Leaflet's default icon URLs, so point them at the bundled assets.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** The donor's side: the pickup address. Uses the (fixed) default pin. */
export const pickupIcon = new L.Icon.Default();

/** The person on the move: a circular marker with a pulsing ring (styles live in index.css). */
export const travellerIcon = L.divIcon({
  className: 'live-marker',
  html: '<span class="live-marker__pulse"></span><span class="live-marker__dot"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});
