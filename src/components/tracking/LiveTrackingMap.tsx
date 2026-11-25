import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import {
  AlertCircle,
  BellRing,
  Loader2,
  LocateFixed,
  Maximize2,
  Navigation,
  Route,
  ShieldCheck,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { pickupIcon, travellerIcon } from '../../utils/leafletSetup';
import { useToast } from '../../context/ToastContext';
import { useLiveLocation } from '../../hooks/useLiveLocation';
import { Button } from '../common/Button';
import { distanceMeters, formatDistanceMeters } from '../../utils/formatDistance';
import {
  ASSUMED_SPEED_KMH,
  STALE_AFTER_S,
  claimNearbyAnnouncement,
  formatAgo,
  formatEta,
  googleDirectionsUrl,
  nextNearby,
} from '../../utils/liveTracking';

interface LiveTrackingMapProps {
  claimId: string;
  pickup: { latitude: number; longitude: number; address: string };
  /** The person on the move (the recipient). */
  travellerId: string;
  travellerName: string;
  /** True when the person looking at the map IS the traveller. */
  isTraveller: boolean;
}

type Tone = 'success' | 'warn' | 'danger';

const BANNER_TONE: Record<Tone, string> = {
  success: 'border-success-500/30 bg-success-500/10 text-success-400',
  warn: 'border-warm-500/30 bg-warm-500/10 text-warm-400',
  danger: 'border-danger-500/30 bg-danger-500/10 text-danger-400',
};

const CHIP_TONE: Record<Tone | 'neutral', string> = {
  ...BANNER_TONE,
  neutral: 'border-base-700 bg-base-800 text-ink-500',
};

function Banner({ tone, icon, title, children }: { tone: Tone; icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div
      role={tone === 'success' ? 'status' : 'alert'}
      className={`mx-4 mb-3 flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 ${BANNER_TONE[tone]}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 text-sm">
        <p className="font-bold">{title}</p>
        {children && <p className="mt-0.5 text-xs font-medium opacity-90">{children}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-base-850 px-3 py-2.5" title={hint}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700">{label}</p>
      <p className="font-display mt-0.5 truncate text-lg text-ink-100">{value}</p>
    </div>
  );
}

interface FitProps {
  pickupLat: number;
  pickupLng: number;
  posLat: number | null;
  posLng: number | null;
  follow: boolean;
  onUserMove: () => void;
}

/** Keeps both markers in view. Stops following as soon as the person pans or zooms themselves. */
function FitToMarkers({ pickupLat, pickupLng, posLat, posLng, follow, onUserMove }: FitProps) {
  const map = useMap();
  // true while our own fitBounds animation runs, so it is not mistaken for the person moving the map
  const programmatic = useRef(false);

  useMapEvents({
    dragstart: () => {
      if (!programmatic.current) onUserMove();
    },
    zoomstart: () => {
      if (!programmatic.current) onUserMove();
    },
  });

  useEffect(() => {
    if (!follow) return;
    programmatic.current = true;
    if (posLat !== null && posLng !== null) {
      map.fitBounds(
        L.latLngBounds([
          [pickupLat, pickupLng],
          [posLat, posLng],
        ]),
        { padding: [48, 48], maxZoom: 17 }
      );
    } else {
      map.setView([pickupLat, pickupLng], 16);
    }
    const timer = window.setTimeout(() => {
      programmatic.current = false;
    }, 900);
    return () => window.clearTimeout(timer);
  }, [map, follow, pickupLat, pickupLng, posLat, posLng]);

  return null;
}

export function LiveTrackingMap({ claimId, pickup, travellerId, travellerName, isTraveller }: LiveTrackingMapProps) {
  const { showToast } = useToast();
  const live = useLiveLocation(claimId, { travellerId, canShare: isTraveller });
  const [follow, setFollow] = useState(true);
  const [nearby, setNearby] = useState(false);

  const firstName = travellerName.split(' ')[0] || travellerName;

  // The position on screen: the traveller sees their own device's fix straight away,
  // everyone else sees what was stored (and arrives through Realtime).
  const position = isTraveller
    ? live.myPosition && {
        latitude: live.myPosition.latitude,
        longitude: live.myPosition.longitude,
        accuracy: live.myPosition.accuracy,
        at: live.myPosition.timestamp,
      }
    : live.remote && {
        latitude: live.remote.latitude,
        longitude: live.remote.longitude,
        accuracy: live.remote.accuracy,
        at: Date.parse(live.remote.updatedAt),
      };

  const ageSec = position ? Math.max(0, Math.floor((live.now - position.at) / 1000)) : null;
  const viewerStale = !isTraveller && ageSec !== null && ageSec > STALE_AFTER_S;
  const distance = position ? distanceMeters(position, pickup) : null;

  // 100 m alert state, with hysteresis (on at <= 100 m, off only beyond 130 m). Derived during render.
  const nextNear = viewerStale ? false : nextNearby(nearby, distance, position?.accuracy ?? null);
  if (nextNear !== nearby) setNearby(nextNear);

  // Toast + vibration for the recipient, once per claim.
  useEffect(() => {
    if (!nearby || !isTraveller) return;
    if (!claimNearbyAnnouncement(claimId)) return;
    showToast('success', "You're almost there — 100 m away");
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      // vibration is optional
    }
  }, [nearby, isTraveller, claimId, showToast]);

  async function handleStop() {
    const cleared = await live.stopSharing();
    if (cleared) showToast('info', 'Location sharing stopped.');
    else
      showToast(
        'error',
        "Sharing stopped on this device, but your last position couldn't be removed yet. It will be cleared automatically."
      );
  }

  // ---- header status chip ----
  let chip: { label: string; tone: Tone | 'neutral' };
  if (isTraveller) {
    if (!live.isSharing) chip = { label: 'Not sharing', tone: 'neutral' };
    else if (live.signal === 'lost') chip = { label: 'No signal', tone: 'warn' };
    else chip = { label: 'Live', tone: 'success' };
  } else if (!position) chip = { label: 'Waiting', tone: 'neutral' };
  else if (viewerStale) chip = { label: 'Signal lost', tone: 'warn' };
  else chip = { label: 'Live', tone: 'success' };

  const subtitle = isTraveller
    ? live.isSharing
      ? 'The donor can see you on the map'
      : 'Share your location so the donor can see you coming'
    : position
      ? `${firstName} is on the way to the pickup`
      : `${firstName} hasn't started sharing yet`;

  const pickupLatLng: [number, number] = [pickup.latitude, pickup.longitude];
  const posLatLng: [number, number] | null = position ? [position.latitude, position.longitude] : null;
  const showAccuracy = position?.accuracy != null && position.accuracy > 15 && position.accuracy < 1000;

  return (
    <section className="overflow-hidden rounded-3xl border border-base-700 bg-base-900 shadow-card" aria-label="Live tracking">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-base-700 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-600 text-white">
          <Navigation size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-base text-ink-100">Live tracking</h2>
          <p className="truncate text-xs text-ink-500">{subtitle}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${CHIP_TONE[chip.tone]}`}>
          {chip.label}
        </span>
      </header>

      {/* Always-on privacy indicator for the person sharing */}
      {isTraveller && live.isSharing && (
        <div
          role="status"
          className="flex items-center gap-3 border-b border-danger-500/20 bg-danger-500/10 px-4 py-2.5 text-danger-400"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-danger-500 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger-500" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">You are sharing your location</p>
            <p className="truncate text-xs font-medium opacity-90">
              {live.status === 'starting'
                ? 'Waiting for a GPS fix…'
                : live.lastSyncedAt
                  ? `Sent to the donor ${formatAgo(Math.max(0, Math.floor((live.now - live.lastSyncedAt) / 1000)))}`
                  : 'Sending your first position…'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStop}
            className="shrink-0 rounded-xl bg-danger-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-danger-400 active:scale-[0.98]"
          >
            Stop sharing
          </button>
        </div>
      )}

      {/* Distance / ETA / freshness */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <Stat label="Distance" value={distance !== null ? formatDistanceMeters(distance) : '—'} />
        <Stat
          label="ETA"
          value={distance !== null ? formatEta(distance) : '—'}
          hint={`Straight-line estimate at ${ASSUMED_SPEED_KMH} km/h`}
        />
        <Stat label="Updated" value={ageSec !== null ? formatAgo(ageSec) : '—'} />
      </div>

      {/* Banners */}
      {nearby && (
        <Banner tone="success" icon={<BellRing size={18} />} title={isTraveller ? "You're almost there — 100 m away" : 'The recipient is nearby'}>
          {distance !== null && `${formatDistanceMeters(distance)} from the pickup`}
        </Banner>
      )}
      {isTraveller && live.status === 'denied' && (
        <Banner tone="danger" icon={<AlertCircle size={18} />} title="Location access is blocked">
          Allow location for this site in your browser settings, then tap &ldquo;Start sharing my location&rdquo; again.
        </Banner>
      )}
      {isTraveller && live.status === 'unsupported' && (
        <Banner tone="danger" icon={<AlertCircle size={18} />} title="Location isn't available on this device">
          Your browser doesn&rsquo;t support location sharing. You can still use chat and call to coordinate.
        </Banner>
      )}
      {isTraveller && live.isSharing && live.signal === 'lost' && (
        <Banner tone="warn" icon={<AlertCircle size={18} />} title="Can't get a GPS fix">
          Move to an open area and check that location services are on. We&rsquo;ll resume automatically.
        </Banner>
      )}
      {isTraveller && live.isSharing && live.signal === 'weak' && (
        <Banner tone="warn" icon={<AlertCircle size={18} />} title="Weak GPS signal">
          Your position may be off by about {Math.round(live.myPosition?.accuracy ?? 0)} m.
        </Banner>
      )}
      {isTraveller && live.isSharing && live.syncError && (
        <Banner tone="warn" icon={<AlertCircle size={18} />} title="Couldn't send your location">
          Check your connection. We&rsquo;ll keep retrying.
        </Banner>
      )}
      {viewerStale && (
        <Banner tone="warn" icon={<AlertCircle size={18} />} title={`No update for ${formatAgo(ageSec ?? 0).replace(' ago', '')}`}>
          {firstName} may have lost signal or stopped sharing. Showing the last known position.
        </Banner>
      )}

      {/* Map. `isolate` keeps Leaflet's high z-index panes beneath the app's toasts and sticky bars. */}
      <div className="relative isolate z-0 h-72 w-full bg-base-800 sm:h-96">
        <MapContainer
          center={pickupLatLng}
          zoom={15}
          scrollWheelZoom={false}
          className="h-full w-full"
          aria-label="Map showing the pickup location and the recipient"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <Marker position={pickupLatLng} icon={pickupIcon}>
            <Tooltip permanent direction="right">
              Pickup
            </Tooltip>
          </Marker>

          {posLatLng && position && (
            <>
              <Polyline
                positions={[pickupLatLng, posLatLng]}
                pathOptions={{ color: '#f26b1d', weight: 4, opacity: 0.85, dashArray: '8 10' }}
              />
              {showAccuracy && (
                <Circle
                  center={posLatLng}
                  radius={position.accuracy ?? 0}
                  pathOptions={{ color: '#f26b1d', weight: 1, fillColor: '#f26b1d', fillOpacity: 0.1 }}
                />
              )}
              <Marker position={posLatLng} icon={travellerIcon} zIndexOffset={1000}>
                <Tooltip direction="right">{isTraveller ? 'You' : firstName}</Tooltip>
              </Marker>
            </>
          )}

          <FitToMarkers
            pickupLat={pickup.latitude}
            pickupLng={pickup.longitude}
            posLat={position?.latitude ?? null}
            posLng={position?.longitude ?? null}
            follow={follow}
            onUserMove={() => setFollow(false)}
          />
        </MapContainer>

        {!position && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] rounded-xl bg-base-900/95 px-3 py-2 text-xs font-semibold text-ink-300 shadow-card">
            {isTraveller
              ? 'Start sharing to see yourself on the map.'
              : `Waiting for ${firstName} to start sharing their location…`}
          </div>
        )}

        {!follow && position && (
          <button
            type="button"
            onClick={() => setFollow(true)}
            className="absolute bottom-6 right-3 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-base-900 px-3 py-2 text-xs font-bold text-brand-400 shadow-card-hover"
          >
            <Maximize2 size={13} /> Show both
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 p-4">
        {isTraveller && !live.isSharing && (
          <div className="rounded-2xl bg-base-850 p-3.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-100">
              <ShieldCheck size={16} className="text-success-400" /> Your privacy
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
              Nothing is shared until you tap the button. Then the donor (and the delivery volunteer, if one is assigned)
              can see where you are while you travel. Only your latest position is kept &mdash; never a history &mdash; and
              sharing ends when you tap Stop, confirm the pickup, or the request ends. Keep this page open: browsers pause
              location updates in the background.
            </p>
            <Button className="mt-3 w-full gap-2 sm:w-auto" onClick={live.startSharing}>
              <LocateFixed size={16} /> Start sharing my location
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={googleDirectionsUrl(pickup, isTraveller ? undefined : (position ?? undefined))}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-500/40 bg-base-900 px-3.5 py-2 text-sm font-bold text-brand-400 hover:bg-brand-700/10"
          >
            <Route size={15} /> Directions
          </a>
          {live.status === 'starting' && !live.myPosition && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
              <Loader2 size={13} className="animate-spin" /> Looking for GPS…
            </span>
          )}
          <p className="min-w-0 flex-1 truncate text-right text-xs text-ink-500">{pickup.address}</p>
        </div>
      </div>
    </section>
  );
}
