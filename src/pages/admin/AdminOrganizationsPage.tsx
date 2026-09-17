import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useToast } from '../../context/ToastContext';
import { fetchOrganizationsForModeration, verifyOrganizationAsAdmin } from '../../api/admin';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../../components/common/States';
import { ORG_TYPE_LABELS, ORG_VERIFICATION_LABELS } from '../../types/domain';
import type { OrgVerificationStatus } from '../../types/database';
import { getErrorMessage } from '../../utils/errors';

export function AdminOrganizationsPage() {
  const [filter, setFilter] = useState<OrgVerificationStatus | undefined>('pending');
  const { data: orgs, loading, error, refetch } = useAsyncData(
    () => fetchOrganizationsForModeration(filter),
    [filter]
  );
  const { showToast } = useToast();
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function handleDecision(orgId: string, decision: OrgVerificationStatus) {
    setActingOn(orgId);
    try {
      await verifyOrganizationAsAdmin(orgId, decision);
      showToast('success', `Organization ${ORG_VERIFICATION_LABELS[decision].toLowerCase()}.`);
      refetch();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not update organization.'));
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-100">Organizations</h1>

      <div className="flex gap-2">
        {(['pending', 'verified', 'rejected', 'suspended', undefined] as const).map((s) => (
          <button
            key={s ?? 'all'}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filter === s ? 'bg-brand-700/20 text-brand-300' : 'text-ink-500 hover:text-ink-100'
            }`}
          >
            {s ? ORG_VERIFICATION_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner label="Loading organizations" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && orgs && orgs.length === 0 && <EmptyState title="Nothing here" />}

      {orgs && orgs.length > 0 && (
        <div className="flex flex-col gap-3">
          {orgs.map((org) => (
            <div key={org.id} className="rounded-lg border border-base-700 bg-base-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-ink-100">{org.name}</p>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {ORG_TYPE_LABELS[org.orgType]}
                    {org.registrationNumber && ` · Reg. ${org.registrationNumber}`}
                  </p>
                  {org.description && <p className="mt-2 text-sm text-ink-300">{org.description}</p>}
                </div>
                <span className="text-sm text-ink-500">{ORG_VERIFICATION_LABELS[org.verificationStatus]}</span>
              </div>
              {org.verificationStatus === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <Button loading={actingOn === org.id} onClick={() => handleDecision(org.id, 'verified')}>
                    Verify
                  </Button>
                  <Button variant="secondary" loading={actingOn === org.id} onClick={() => handleDecision(org.id, 'rejected')}>
                    Reject
                  </Button>
                </div>
              )}
              {org.verificationStatus === 'verified' && (
                <div className="mt-4">
                  <Button variant="danger" loading={actingOn === org.id} onClick={() => handleDecision(org.id, 'suspended')}>
                    Suspend
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
