import { supabase } from '../lib/supabaseClient';
import type { PickupTask } from '../types/domain';
import type { PickupTaskStatus } from '../types/database';

interface TaskRow {
  id: string;
  donation_id: string;
  claim_id: string;
  volunteer_id: string | null;
  status: PickupTaskStatus;
  pickup_confirmed_at: string | null;
  delivered_confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapTask(row: TaskRow): PickupTask {
  return {
    id: row.id,
    donationId: row.donation_id,
    claimId: row.claim_id,
    volunteerId: row.volunteer_id,
    status: row.status,
    pickupConfirmedAt: row.pickup_confirmed_at,
    deliveredConfirmedAt: row.delivered_confirmed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function acceptPickupTask(taskId: string) {
  const { error } = await supabase.rpc('accept_pickup_task', { p_task_id: taskId });
  if (error) throw error;
}

export async function updateTaskStatus(taskId: string, status: PickupTaskStatus) {
  const { error } = await supabase.rpc('update_task_status', { p_task_id: taskId, p_new_status: status });
  if (error) throw error;
}

/** Open tasks (not yet accepted by any volunteer). Client-side filters by
 * distance when the caller supplies coordinates, since pickup_tasks has no
 * lat/lng of its own — it joins through donations for that. */
export async function fetchOpenTasks(): Promise<(PickupTask & { donation: NonNullable<PickupTask['donation']> })[]> {
  const { data, error } = await supabase
    .from('pickup_tasks')
    .select('*, donations(id, title, pickup_address, latitude, longitude)')
    .eq('status', 'open')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const r = row as unknown as TaskRow & {
        donations: { id: string; title: string; pickup_address: string; latitude: number; longitude: number } | null;
      };
      if (!r.donations) return null;
      return {
        ...mapTask(r),
        donation: {
          id: r.donations.id,
          title: r.donations.title,
          pickupAddress: r.donations.pickup_address,
          latitude: r.donations.latitude,
          longitude: r.donations.longitude,
        },
      };
    })
    .filter((t): t is PickupTask & { donation: NonNullable<PickupTask['donation']> } => t !== null);
}

export async function fetchMyTasks(volunteerId: string): Promise<PickupTask[]> {
  const { data, error } = await supabase
    .from('pickup_tasks')
    .select('*, donations(id, title, pickup_address, latitude, longitude)')
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as TaskRow & {
      donations: { id: string; title: string; pickup_address: string; latitude: number; longitude: number } | null;
    };
    return {
      ...mapTask(r),
      donation: r.donations
        ? {
            id: r.donations.id,
            title: r.donations.title,
            pickupAddress: r.donations.pickup_address,
            latitude: r.donations.latitude,
            longitude: r.donations.longitude,
          }
        : undefined,
    };
  });
}

export async function fetchTaskForDonation(donationId: string): Promise<PickupTask | null> {
  const { data, error } = await supabase
    .from('pickup_tasks')
    .select('*')
    .eq('donation_id', donationId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTask(data) : null;
}
