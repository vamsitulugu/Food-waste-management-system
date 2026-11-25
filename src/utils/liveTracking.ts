import { formatDistanceMeters } from './formatDistance';

/** Upload about every 5 s, or sooner (but never faster than the min gap) after moving more than 10 m. */
export const UPLOAD_INTERVAL_MS = 5000;
export const UPLOAD_MIN_GAP_MS = 1500;
export const UPLOAD_MIN_MOVE_M = 10;
/** Fixes worse than this are not uploaded at all. */
export const MAX_UPLOAD_ACCURACY_M = 200;
/** Accuracy worse than this shows the "weak signal" banner. */
export const WEAK_ACCURACY_M = 60;
/** No GPS fix for this long = "lost". */
export const NO_FIX_AFTER_MS = 30000;
/** A stored position older than this is shown as stale to the viewer. */
export const STALE_AFTER_S = 45;

/** Alert hysteresis: on at <= 100 m, off again only beyond 130 m. */
export const NEARBY_ON_M = 100;
export const NEARBY_OFF_M = 130;
/** A fix this imprecise cannot trigger the alert (matches the server rule). */
export const NEARBY_MAX_ACCURACY_M = 60;

export const ASSUMED_SPEED_KMH = 25;

export function nextNearby(current: boolean, distance: number | null, accuracy: number | null): boolean {
  if (distance === null) return false;
  if (current) return distance <= NEARBY_OFF_M;
  return distance <= NEARBY_ON_M && (accuracy ?? 0) <= NEARBY_MAX_ACCURACY_M;
}

/** "5 s ago", "2 min ago", "1 h ago". */
export function formatAgo(seconds: number): string {
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ago`;
}

/** Straight-line ETA at the assumed speed. */
export function formatEta(meters: number): string {
  if (meters <= NEARBY_ON_M) return 'Arriving';
  const minutes = Math.max(1, Math.round(meters / ((ASSUMED_SPEED_KMH * 1000) / 60)));
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `~${h} h ${rest} min` : `~${h} h`;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

export function googleDirectionsUrl(destination: LatLng, origin?: LatLng): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: 'driving',
  });
  if (origin) params.set('origin', `${origin.latitude},${origin.longitude}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// ---- "once per claim" announcement (toast + vibration), remembered across reloads ----
const announced = new Set<string>();

/** Returns true the first time it is called for a claim (in this tab and this browser session). */
export function claimNearbyAnnouncement(claimId: string): boolean {
  if (announced.has(claimId)) return false;
  announced.add(claimId);
  const key = `nearby-announced:${claimId}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
  } catch {
    // storage unavailable: the in-memory set still prevents repeats
  }
  return true;
}

export { formatDistanceMeters };
