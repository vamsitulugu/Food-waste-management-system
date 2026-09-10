import { supabase } from '../lib/supabaseClient';
import type { Organization, OrganizationMember } from '../types/domain';
import type { OrgType, OrgMemberRole } from '../types/database';

function mapOrg(row: {
  id: string;
  name: string;
  org_type: OrgType;
  registration_number: string | null;
  description: string | null;
  verification_status: Organization['verificationStatus'];
  verified_by: string | null;
  verified_at: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}): Organization {
  return {
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
  };
}

export interface CreateOrganizationInput {
  name: string;
  orgType: OrgType;
  registrationNumber?: string;
  description?: string;
  address?: string;
}

export async function createOrganization(userId: string, input: CreateOrganizationInput) {
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: input.name,
      org_type: input.orgType,
      registration_number: input.registrationNumber || null,
      description: input.description || null,
      address: input.address || null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return mapOrg(data);
}

/** Organizations the current user belongs to. */
export async function fetchMyOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organizations(*)')
    .order('created_at', { ascending: false, referencedTable: 'organizations' });
  if (error) throw error;

  return (data ?? [])
    .map((row) => (row as unknown as { organizations: Parameters<typeof mapOrg>[0] | null }).organizations)
    .filter((org): org is Parameters<typeof mapOrg>[0] => org !== null)
    .map(mapOrg);
}

export async function fetchOrganization(orgId: string): Promise<Organization> {
  const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
  if (error) throw error;
  return mapOrg(data);
}

export async function fetchOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, profile_id, org_role, created_at, profiles(id, full_name, avatar_url)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      organization_id: string;
      profile_id: string;
      org_role: OrgMemberRole;
      created_at: string;
      profiles: { id: string; full_name: string; avatar_url: string | null } | null;
    };
    return {
      organizationId: r.organization_id,
      profileId: r.profile_id,
      orgRole: r.org_role,
      createdAt: r.created_at,
      profile: r.profiles
        ? { id: r.profiles.id, fullName: r.profiles.full_name, avatarUrl: r.profiles.avatar_url }
        : undefined,
    };
  });
}

/** Invites are keyed by profile id for MVP. Looking a person up by email
 * client-side isn't possible (auth.users isn't queryable from the browser),
 * so the invitee shares their profile id (shown on their own profile page)
 * with an org owner/admin. A proper email-based invite flow is a [FUTURE]
 * improvement noted in the architecture. */
export async function inviteMember(orgId: string, targetProfileId: string, role: OrgMemberRole = 'member') {
  const { error } = await supabase.rpc('add_organization_member', {
    p_org_id: orgId,
    p_target_profile_id: targetProfileId,
    p_new_org_role: role,
  });
  if (error) throw error;
}

export async function updateMemberRole(orgId: string, targetProfileId: string, newRole: OrgMemberRole) {
  const { error } = await supabase.rpc('update_member_role', {
    p_org_id: orgId,
    p_target_profile_id: targetProfileId,
    p_new_role: newRole,
  });
  if (error) throw error;
}

export async function removeMember(orgId: string, targetProfileId: string) {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', orgId)
    .eq('profile_id', targetProfileId);
  if (error) throw error;
}
