import { supabase } from '../lib/supabaseClient';
import type { Profile, Organization, Report, Donation } from '../types/domain';
import type { OrgVerificationStatus, ReportStatus } from '../types/database';

function mapProfile(row: {
  id: string;
  full_name: string;
  role: Profile['role'];
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProfile);
}

export async function provisionAdmin(targetProfileId: string) {
  const { error } = await supabase.rpc('provision_admin', { target_profile_id: targetProfileId });
  if (error) throw error;
}

export async function fetchOrganizationsForModeration(
  status?: OrgVerificationStatus
): Promise<Organization[]> {
  let query = supabase.from('organizations').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('verification_status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    orgType: row.org_type,
    registrationNumber: row.registration_number,
    description: row.description,
    verificationStatus: row.verification_status,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function verifyOrganizationAsAdmin(orgId: string, decision: OrgVerificationStatus) {
  const { error } = await supabase.rpc('verify_organization', { p_org_id: orgId, p_decision: decision });
  if (error) throw error;
}

export async function fetchReports(status?: ReportStatus): Promise<Report[]> {
  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    reporterId: row.reporter_id,
    reportedDonationId: row.reported_donation_id,
    reportedProfileId: row.reported_profile_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  }));
}

export async function resolveReportAsAdmin(reportId: string, decision: ReportStatus) {
  const { error } = await supabase.rpc('resolve_report', { p_report_id: reportId, p_decision: decision });
  if (error) throw error;
}

export async function adminRejectDonation(donationId: string, reason: string) {
  const { error } = await supabase.rpc('admin_reject_donation', { p_donation_id: donationId, p_reason: reason });
  if (error) throw error;
}

export async function fetchDonationById(donationId: string): Promise<Donation | null> {
  const { data, error } = await supabase.from('donations').select('*').eq('id', donationId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    donorId: data.donor_id,
    organizationId: data.organization_id,
    title: data.title,
    description: data.description,
    category: data.category,
    quantityValue: data.quantity_value,
    quantityUnit: data.quantity_unit,
    isVegetarian: data.is_vegetarian,
    allergens: data.allergens,
    storageRequirement: data.storage_requirement,
    packagingCondition: data.packaging_condition,
    preparedAt: data.prepared_at,
    expiresAt: data.expires_at,
    pickupWindowStart: data.pickup_window_start,
    pickupWindowEnd: data.pickup_window_end,
    pickupAddress: data.pickup_address,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    cancellationReason: data.cancellation_reason,
    rejectionReason: data.rejection_reason,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function fetchDonationsForAdmin(filters: { status?: string; search?: string } = {}): Promise<Donation[]> {
  let query = supabase.from('donations').select('*').order('created_at', { ascending: false }).limit(100);
  if (filters.status) query = query.eq('status', filters.status as Donation['status']);
  if (filters.search) query = query.ilike('title', `%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    donorId: row.donor_id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    category: row.category,
    quantityValue: row.quantity_value,
    quantityUnit: row.quantity_unit,
    isVegetarian: row.is_vegetarian,
    allergens: row.allergens,
    storageRequirement: row.storage_requirement,
    packagingCondition: row.packaging_condition,
    preparedAt: row.prepared_at,
    expiresAt: row.expires_at,
    pickupWindowStart: row.pickup_window_start,
    pickupWindowEnd: row.pickup_window_end,
    pickupAddress: row.pickup_address,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    cancellationReason: row.cancellation_reason,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName?: string;
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      actor_id: string | null;
      action: string;
      entity_type: string;
      entity_id: string;
      metadata: Record<string, unknown> | null;
      created_at: string;
      profiles: { full_name: string } | null;
    };
    return {
      id: r.id,
      actorId: r.actor_id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      metadata: r.metadata,
      createdAt: r.created_at,
      actorName: r.profiles?.full_name,
    };
  });
}

export interface PlatformStats {
  totalUsers: number;
  totalDonations: number;
  completedDonations: number;
  activeDonations: number;
  pendingOrgVerifications: number;
  openReports: number;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const [users, donations, completed, active, pendingOrgs, openReports] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('donations').select('id', { count: 'exact', head: true }),
    supabase.from('donations').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('donations').select('id', { count: 'exact', head: true }).in('status', ['available', 'claimed', 'pickup_assigned', 'picked_up', 'delivered']),
    supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  const firstError = [users, donations, completed, active, pendingOrgs, openReports].find((r) => r.error)?.error;
  if (firstError) throw firstError;

  return {
    totalUsers: users.count ?? 0,
    totalDonations: donations.count ?? 0,
    completedDonations: completed.count ?? 0,
    activeDonations: active.count ?? 0,
    pendingOrgVerifications: pendingOrgs.count ?? 0,
    openReports: openReports.count ?? 0,
  };
}
