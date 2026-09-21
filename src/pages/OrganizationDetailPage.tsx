import { useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  fetchOrganization,
  fetchOrganizationMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from '../api/organizations';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/States';
import { ORG_TYPE_LABELS, ORG_VERIFICATION_LABELS } from '../types/domain';
import type { OrgMemberRole } from '../types/database';
import { getErrorMessage } from '../utils/errors';

const VERIFICATION_BADGE: Record<string, string> = {
  verified: 'text-brand-400',
  pending: 'text-warning-400',
  rejected: 'text-danger-400',
  suspended: 'text-danger-400',
};

export function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { session } = useAuth();
  const { showToast } = useToast();

  const {
    data: org,
    loading: orgLoading,
    error: orgError,
    refetch: refetchOrg,
  } = useAsyncData(() => fetchOrganization(orgId!), [orgId]);

  const {
    data: members,
    loading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useAsyncData(() => fetchOrganizationMembers(orgId!), [orgId]);

  const [inviteProfileId, setInviteProfileId] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgMemberRole>('member');
  const [inviting, setInviting] = useState(false);

  const myMembership = members?.find((m) => m.profileId === session?.user.id);
  const canManageMembers = myMembership?.orgRole === 'owner' || myMembership?.orgRole === 'admin';
  const isOwner = myMembership?.orgRole === 'owner';

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    const trimmed = inviteProfileId.trim();
    if (!trimmed) return;
    setInviting(true);
    try {
      await inviteMember(orgId!, trimmed, inviteRole);
      setInviteProfileId('');
      showToast('success', 'Member added.');
      refetchMembers();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not add member.'));
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(targetProfileId: string, newRole: OrgMemberRole) {
    try {
      await updateMemberRole(orgId!, targetProfileId, newRole);
      showToast('success', 'Member role updated.');
      refetchMembers();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not update role.'));
    }
  }

  async function handleRemove(targetProfileId: string) {
    try {
      await removeMember(orgId!, targetProfileId);
      showToast('success', 'Member removed.');
      refetchMembers();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not remove member.'));
    }
  }

  if (orgLoading) return <LoadingSpinner label="Loading organization" />;
  if (orgError || !org) return <ErrorState message={orgError ?? 'Organization not found.'} onRetry={refetchOrg} />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">{org.name}</h1>
          <span className={`text-sm ${VERIFICATION_BADGE[org.verificationStatus]}`}>
            {ORG_VERIFICATION_LABELS[org.verificationStatus]}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-500">{ORG_TYPE_LABELS[org.orgType]}</p>
        {org.description && <p className="mt-3 max-w-xl text-sm text-ink-300">{org.description}</p>}
        {org.address && <p className="mt-1 text-sm text-ink-500">{org.address}</p>}
        {org.verificationStatus === 'pending' && (
          <p className="mt-3 text-sm text-warning-400">
            This organization is awaiting admin verification. Some actions may be limited until then.
          </p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-ink-100">Members</h2>
        {membersLoading && <LoadingSpinner label="Loading members" />}
        {membersError && <ErrorState message={membersError} onRetry={refetchMembers} />}

        {members && (
          <div className="mt-3 flex flex-col gap-2">
            {members.map((m) => (
              <div
                key={m.profileId}
                className="flex items-center justify-between rounded-xl border border-base-700 bg-base-900 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-ink-100">{m.profile?.fullName ?? 'Unknown user'}</p>
                  <p className="text-xs text-ink-500 capitalize">{m.orgRole}</p>
                </div>
                {isOwner && m.profileId !== session?.user.id && (
                  <div className="flex items-center gap-2">
                    <select
                      value={m.orgRole}
                      onChange={(e) => handleRoleChange(m.profileId, e.target.value as OrgMemberRole)}
                      className="rounded-xl border border-base-700 bg-base-850 px-2 py-1.5 text-xs text-ink-100"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button variant="ghost" onClick={() => handleRemove(m.profileId)}>
                      Remove
                    </Button>
                  </div>
                )}
                {canManageMembers && !isOwner && m.profileId === session?.user.id && (
                  <Button variant="ghost" onClick={() => handleRemove(m.profileId)}>
                    Leave
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {canManageMembers && (
        <form
          onSubmit={handleInvite}
          className="flex flex-col gap-4 rounded-2xl border border-base-700 bg-base-900 shadow-card p-6"
        >
          <div>
            <h2 className="text-sm font-medium text-ink-100">Add a member</h2>
            <p className="mt-1 text-sm text-ink-500">
              Membership is invite-only. Ask the person to share their profile ID from their
              profile page, then add them here.
            </p>
          </div>
          <Input
            label="Profile ID"
            value={inviteProfileId}
            onChange={(e) => setInviteProfileId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            required
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-role" className="text-sm text-ink-300">
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgMemberRole)}
              className="rounded-xl border border-base-700 bg-base-850 px-3 py-2.5 text-sm text-ink-100"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <Button type="submit" loading={inviting}>
              Add member
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
