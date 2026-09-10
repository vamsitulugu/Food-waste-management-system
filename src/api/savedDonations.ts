import { supabase } from '../lib/supabaseClient';
import type { Donation } from '../types/domain';

export async function isDonationSaved(profileId: string, donationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('saved_donations')
    .select('donation_id')
    .eq('profile_id', profileId)
    .eq('donation_id', donationId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function saveDonation(profileId: string, donationId: string) {
  const { error } = await supabase.from('saved_donations').insert({ profile_id: profileId, donation_id: donationId });
  if (error) throw error;
}

export async function unsaveDonation(profileId: string, donationId: string) {
  const { error } = await supabase
    .from('saved_donations')
    .delete()
    .eq('profile_id', profileId)
    .eq('donation_id', donationId);
  if (error) throw error;
}

export async function fetchSavedDonations(profileId: string): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('saved_donations')
    .select('donations(*)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? [])
    .map((row) => (row as unknown as { donations: Record<string, unknown> | null }).donations)
    .filter((d): d is Record<string, unknown> => d !== null)
    .map((d) => ({
      id: d.id as string,
      donorId: d.donor_id as string,
      organizationId: d.organization_id as string | null,
      title: d.title as string,
      description: d.description as string | null,
      category: d.category as Donation['category'],
      quantityValue: d.quantity_value as number,
      quantityUnit: d.quantity_unit as Donation['quantityUnit'],
      isVegetarian: d.is_vegetarian as boolean | null,
      allergens: d.allergens as string[] | null,
      storageRequirement: d.storage_requirement as Donation['storageRequirement'],
      packagingCondition: d.packaging_condition as string | null,
      preparedAt: d.prepared_at as string | null,
      expiresAt: d.expires_at as string,
      pickupWindowStart: d.pickup_window_start as string,
      pickupWindowEnd: d.pickup_window_end as string,
      pickupAddress: d.pickup_address as string,
      latitude: d.latitude as number,
      longitude: d.longitude as number,
      status: d.status as Donation['status'],
      cancellationReason: d.cancellation_reason as string | null,
      rejectionReason: d.rejection_reason as string | null,
      createdAt: d.created_at as string,
      updatedAt: d.updated_at as string,
    }));
}
