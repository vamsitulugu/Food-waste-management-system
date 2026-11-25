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

const DONATION_EMBED =
  'donations(id, title, pickup_address, latitude, longitude, quantity_value, quantity_unit, pickup_window_start, pickup_window_end, category, is_vegetarian)';

interface DonationEmbed {
  id: string;
  title: string;
  pickup_address: string;
  latitude: number;
  longitude: number;
  quantity_value: number;
  quantity_unit: NonNullable<PickupTask['donation']>['quantityUnit'];
  pickup_window_start: string;
  pickup_window_end: string;
  category: NonNullable<PickupTask['donation']>['category'];
  is_vegetarian: boolean | null;
}

function mapDonationEmbed(d: DonationEmbed): NonNullable<PickupTask['donation']> {
  return {
    id: d.id,
    title: d.title,
    pickupAddress: d.pickup_address,
    latitude: d.latitude,
    longitude: d.longitude,
    quantityValue: d.quantity_value,
    quantityUnit: d.quantity_unit,
    pickupWindowStart: d.pickup_window_start,
    pickupWindowEnd: d.pickup_window_end,
    category: d.category,
    isVegetarian: d.is_vegetarian,
  };
}

/** Open tasks (not yet accepted by any volunteer), oldest first. */
export async function fetchOpenTasks(): Promise<(PickupTask & { donation: NonNullable<PickupTask['donation']> })[]> {
  const { data, error } = await supabase
    .from('pickup_tasks')
    .select(`*, ${DONATION_EMBED}`)
    .eq('status', 'open')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const r = row as unknown as TaskRow & { donations: DonationEmbed | null };
      if (!r.donations) return null;
      return { ...mapTask(r), donation: mapDonationEmbed(r.donations) };
    })
    .filter((t): t is PickupTask & { donation: NonNullable<PickupTask['donation']> } => t !== null);
}

export async function fetchMyTasks(volunteerId: string): Promise<PickupTask[]> {
  const { data, error } = await supabase
    .from('pickup_tasks')
    .select(`*, ${DONATION_EMBED}`)
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as TaskRow & { donations: DonationEmbed | null };
    return { ...mapTask(r), donation: r.donations ? mapDonationEmbed(r.donations) : undefined };
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
