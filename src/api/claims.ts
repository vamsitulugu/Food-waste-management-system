import { supabase } from '../lib/supabaseClient';
import type { DonationClaim } from '../types/domain';
import type { FulfillmentMethod, DonationStatus } from '../types/database';

interface ClaimRow {
  id: string;
  donation_id: string;
  claimant_id: string;
  organization_id: string | null;
  fulfillment_method: FulfillmentMethod;
  status: DonationClaim['status'];
  message: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapClaim(row: ClaimRow): DonationClaim {
  return {
    id: row.id,
    donationId: row.donation_id,
    claimantId: row.claimant_id,
    organizationId: row.organization_id,
    fulfillmentMethod: row.fulfillment_method,
    status: row.status,
    message: row.message,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createClaim(
  donationId: string,
  fulfillmentMethod: FulfillmentMethod,
  organizationId?: string | null,
  message?: string
) {
  const { data, error } = await supabase.rpc('create_claim', {
    p_donation_id: donationId,
    p_fulfillment_method: fulfillmentMethod,
    p_organization_id: organizationId || null,
    p_message: message || null,
  });
  if (error) throw error;
  return data as string;
}

export async function acceptClaim(claimId: string) {
  const { error } = await supabase.rpc('accept_claim', { p_claim_id: claimId });
  if (error) throw error;
}

export async function rejectClaim(claimId: string) {
  const { error } = await supabase.rpc('reject_claim', { p_claim_id: claimId });
  if (error) throw error;
}

export async function cancelClaim(claimId: string) {
  const { error } = await supabase.rpc('cancel_claim', { p_claim_id: claimId });
  if (error) throw error;
}

export async function confirmSelfPickup(claimId: string) {
  const { error } = await supabase.rpc('confirm_self_pickup', { p_claim_id: claimId });
  if (error) throw error;
}

export async function confirmDelivery(claimId: string) {
  const { error } = await supabase.rpc('confirm_delivery', { p_claim_id: claimId });
  if (error) throw error;
}

export async function fetchClaimsForDonation(donationId: string): Promise<DonationClaim[]> {
  const { data, error } = await supabase
    .from('donation_claims')
    .select('*, profiles!donation_claims_claimant_id_fkey(id, full_name), organizations(id, name)')
    .eq('donation_id', donationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as ClaimRow & {
      profiles: { id: string; full_name: string } | null;
      organizations: { id: string; name: string } | null;
    };
    return {
      ...mapClaim(r),
      claimant: r.profiles ? { id: r.profiles.id, fullName: r.profiles.full_name } : undefined,
      organization: r.organizations ? { id: r.organizations.id, name: r.organizations.name } : undefined,
    };
  });
}

export async function fetchMyClaims(claimantId: string): Promise<DonationClaim[]> {
  const { data, error } = await supabase
    .from('donation_claims')
    .select('*, donations(id, title, status)')
    .eq('claimant_id', claimantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as ClaimRow & {
      donations: { id: string; title: string; status: DonationStatus } | null;
    };
    return {
      ...mapClaim(r),
      donation: r.donations
        ? { id: r.donations.id, title: r.donations.title, status: r.donations.status }
        : undefined,
    };
  });
}
