import { supabase } from '../lib/supabaseClient';
import type { LiveLocation } from '../types/domain';

/** A GPS fix as it is sent to the server. */
export interface PositionFix {
  latitude: number;
  longitude: number;
  /** Metres, or null when the device did not report it. */
  accuracy: number | null;
  /** Degrees clockwise from north, or null when unknown / standing still. */
  heading: number | null;
}

interface LiveLocationRow {
  claim_id: string;
  profile_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  updated_at: string;
}

function mapLocation(row: LiveLocationRow): LiveLocation {
  return {
    claimId: row.claim_id,
    profileId: row.profile_id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    heading: row.heading,
    updatedAt: row.updated_at,
  };
}

/** Latest stored position(s) for one claim. RLS limits this to people on the pickup. */
export async function fetchLiveLocations(claimId: string): Promise<LiveLocation[]> {
  const { data, error } = await supabase.from('live_locations').select('*').eq('claim_id', claimId);
  if (error) throw error;
  return (data ?? []).map(mapLocation);
}

/** Upserts my latest position (recipient or assigned volunteer only; enforced in the RPC). */
export async function pushLiveLocation(claimId: string, fix: PositionFix) {
  const { error } = await supabase.rpc('update_live_location', {
    p_claim_id: claimId,
    p_lat: fix.latitude,
    p_lng: fix.longitude,
    p_accuracy: fix.accuracy,
    p_heading: fix.heading,
  });
  if (error) throw error;
}

/** Removes my stored position for this claim. */
export async function stopLiveLocation(claimId: string) {
  const { error } = await supabase.rpc('stop_live_location', { p_claim_id: claimId });
  if (error) throw error;
}

export type LiveLocationEvent =
  | { kind: 'upsert'; location: LiveLocation }
  | { kind: 'delete'; profileId: string | null };

/**
 * Live-subscribe to position changes for one claim. Returns an unsubscribe fn.
 * Realtime cannot reliably deliver filtered DELETE events, so callers also resync periodically.
 */
export function subscribeToLiveLocations(claimId: string, onEvent: (e: LiveLocationEvent) => void) {
  const channel = supabase
    .channel(`live:${claimId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'live_locations', filter: `claim_id=eq.${claimId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as Partial<LiveLocationRow>;
          onEvent({ kind: 'delete', profileId: old.profile_id ?? null });
        } else {
          onEvent({ kind: 'upsert', location: mapLocation(payload.new as LiveLocationRow) });
        }
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
