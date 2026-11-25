import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchLiveLocations,
  pushLiveLocation,
  stopLiveLocation,
  subscribeToLiveLocations,
} from '../api/liveLocation';
import type { PositionFix } from '../api/liveLocation';
import type { LiveLocation } from '../types/domain';
import { getErrorMessage } from '../utils/errors';
import { distanceMeters } from '../utils/formatDistance';
import {
  MAX_UPLOAD_ACCURACY_M,
  NO_FIX_AFTER_MS,
  UPLOAD_INTERVAL_MS,
  UPLOAD_MIN_GAP_MS,
  UPLOAD_MIN_MOVE_M,
  WEAK_ACCURACY_M,
} from '../utils/liveTracking';

/** idle = not sharing · starting = waiting for the first GPS fix · sharing = fixes are flowing */
export type SharingStatus = 'idle' | 'starting' | 'sharing' | 'denied' | 'unsupported';
export type SignalQuality = 'ok' | 'weak' | 'lost';

/** The device's own latest fix (shown to the person sharing without waiting for a round trip). */
export interface MyPosition extends PositionFix {
  /** Epoch ms of the fix, as reported by the device. */
  timestamp: number;
}

interface Options {
  /** The person whose position the map follows (the recipient). */
  travellerId: string | null;
  /** True only for the traveller's own device: enables the GPS watcher + uploads. */
  canShare: boolean;
}

const RESYNC_MS = 15000;

function newer(a: LiveLocation, b: LiveLocation) {
  return Date.parse(a.updatedAt) >= Date.parse(b.updatedAt);
}

/**
 * Live tracking for one claim.
 *
 *  - Everyone on the pickup: `remote` is the traveller's latest stored position,
 *    kept fresh by a Realtime subscription (plus a 15 s resync as a safety net,
 *    because Realtime cannot reliably deliver filtered DELETE events).
 *  - The traveller's own device (`canShare`): `startSharing()` begins
 *    navigator.geolocation.watchPosition and uploads throttled fixes through the
 *    update_live_location RPC; `stopSharing()` ends it and deletes the stored row.
 *
 * All watchers, timers and channels are released on unmount.
 */
export function useLiveLocation(claimId: string, { travellerId, canShare }: Options) {
  const [remote, setRemote] = useState<LiveLocation | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [status, setStatus] = useState<SharingStatus>('idle');
  const [myPosition, setMyPosition] = useState<MyPosition | null>(null);
  const [gpsError, setGpsError] = useState<'unavailable' | 'timeout' | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const uploadingRef = useRef(false);
  const lastUploadRef = useRef<{ at: number; latitude: number; longitude: number } | null>(null);
  const latestFixRef = useRef<MyPosition | null>(null);
  const tickerRef = useRef<number | null>(null);

  // ---- one-second clock for "updated Xs ago" ----
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // ---- the traveller's stored position: initial load + Realtime + resync ----
  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      fetchLiveLocations(claimId)
        .then((rows) => {
          if (cancelled) return;
          const row = rows.find((r) => r.profileId === travellerId) ?? null;
          // never let a slow poll overwrite a newer Realtime update
          setRemote((prev) => (row && prev && !newer(row, prev) ? prev : row));
        })
        .catch(() => undefined);
    };
    sync();

    const unsubscribe = subscribeToLiveLocations(claimId, (event) => {
      if (event.kind === 'upsert') {
        if (event.location.profileId !== travellerId) return;
        setRemote((prev) => (prev && !newer(event.location, prev) ? prev : event.location));
      } else if (event.profileId === null || event.profileId === travellerId) {
        setRemote(null);
      }
    });
    const poll = window.setInterval(sync, RESYNC_MS);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [claimId, travellerId]);

  /** Stops the GPS watcher and the upload ticker. Returns true if sharing was actually running. */
  const releaseWatch = useCallback(() => {
    const wasRunning = watchIdRef.current !== null;
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
    tickerRef.current = null;
    latestFixRef.current = null;
    return wasRunning;
  }, []);

  // ---- uploading (throttled) ----
  const uploadIfDue = useCallback(
    async (fix: PositionFix) => {
      if (uploadingRef.current) return;
      if (fix.accuracy !== null && fix.accuracy > MAX_UPLOAD_ACCURACY_M) return;

      const now = Date.now();
      const last = lastUploadRef.current;
      if (last) {
        const elapsed = now - last.at;
        const movedFar = distanceMeters(last, fix) > UPLOAD_MIN_MOVE_M;
        const due = elapsed >= UPLOAD_INTERVAL_MS || (movedFar && elapsed >= UPLOAD_MIN_GAP_MS);
        if (!due) return;
      }

      // Throttle on the last ATTEMPT, not the last success: when the network is down we must retry
      // at the normal pace, not once per ticker tick.
      lastUploadRef.current = { at: now, latitude: fix.latitude, longitude: fix.longitude };
      uploadingRef.current = true;
      try {
        await pushLiveLocation(claimId, fix);
        setLastSyncedAt(now);
        setSyncError(null);
        // sharing was stopped while this request was in flight: make sure nothing is left behind
        if (watchIdRef.current === null) stopLiveLocation(claimId).catch(() => undefined);
      } catch (err) {
        setSyncError(getErrorMessage(err, 'Could not send your location.'));
      } finally {
        uploadingRef.current = false;
      }
    },
    [claimId]
  );

  // ---- start / stop ----
  const startSharing = useCallback(() => {
    if (!canShare || watchIdRef.current !== null) return;
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    setStatus('starting');
    setStartedAt(Date.now());
    setGpsError(null);
    setSyncError(null);
    lastUploadRef.current = null;
    latestFixRef.current = null;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const c = position.coords;
        const fix: MyPosition = {
          latitude: c.latitude,
          longitude: c.longitude,
          accuracy: Number.isFinite(c.accuracy) ? c.accuracy : null,
          heading: c.heading !== null && Number.isFinite(c.heading) ? c.heading : null,
          timestamp: position.timestamp,
        };
        latestFixRef.current = fix;
        setMyPosition(fix);
        setStatus('sharing');
        setGpsError(null);
        void uploadIfDue(fix);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          releaseWatch();
          setMyPosition(null);
          setStatus('denied');
          return;
        }
        // unavailable / timeout: the watcher keeps running and recovers by itself
        setGpsError(err.code === err.TIMEOUT ? 'timeout' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );

    // Re-check once a second. Some browsers only emit a fix when the position changes, so a fix that the
    // throttle skipped would otherwise never be sent; this also keeps "updated" fresh while standing still.
    // A fix older than NO_FIX_AFTER_MS is never re-sent, so a dead GPS is not reported as live.
    tickerRef.current = window.setInterval(() => {
      const fix = latestFixRef.current;
      if (fix && Date.now() - fix.timestamp < NO_FIX_AFTER_MS) void uploadIfDue(fix);
    }, 1000);
  }, [canShare, uploadIfDue, releaseWatch]);

  /** Stops the watcher and deletes my stored position. Resolves false if the delete failed. */
  const stopSharing = useCallback(async (): Promise<boolean> => {
    releaseWatch();
    lastUploadRef.current = null;
    setStatus('idle');
    setMyPosition(null);
    setGpsError(null);
    setSyncError(null);
    setStartedAt(null);
    try {
      await stopLiveLocation(claimId);
      return true;
    } catch {
      return false;
    }
  }, [claimId, releaseWatch]);

  // ---- unmount (or switching claim): release the watcher and clear my stored position ----
  useEffect(() => {
    return () => {
      if (releaseWatch()) stopLiveLocation(claimId).catch(() => undefined);
    };
  }, [claimId, releaseWatch]);

  // ---- derived: how good is the GPS signal? (only meaningful for the sharer) ----
  let signal: SignalQuality = 'ok';
  if (status === 'sharing' || status === 'starting') {
    const sinceFix = myPosition ? now - myPosition.timestamp : startedAt !== null ? now - startedAt : 0;
    if (gpsError !== null || sinceFix > NO_FIX_AFTER_MS) signal = 'lost';
    else if ((myPosition?.accuracy ?? 0) > WEAK_ACCURACY_M) signal = 'weak';
  }

  return {
    /** Traveller's latest stored position (what the other person sees). */
    remote,
    /** Current time, updated every second. */
    now,
    status,
    isSharing: status === 'sharing' || status === 'starting',
    signal,
    myPosition,
    syncError,
    lastSyncedAt,
    startSharing,
    stopSharing,
  };
}
