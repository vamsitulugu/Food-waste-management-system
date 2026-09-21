import { Link } from 'react-router-dom';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchMyOrganizations } from '../api/organizations';
import { ListRowSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';
import { ORG_TYPE_LABELS, ORG_VERIFICATION_LABELS } from '../types/domain';

const VERIFICATION_BADGE: Record<string, string> = {
  verified: 'text-brand-400',
  pending: 'text-warning-400',
  rejected: 'text-danger-400',
  suspended: 'text-danger-400',
};

export function OrganizationsPage() {
  const { data: orgs, loading, error, refetch } = useAsyncData(fetchMyOrganizations);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Your organizations</h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage NGOs, food banks, or businesses you're part of.
          </p>
        </div>
        <Link to="/organizations/new">
          <Button>New organization</Button>
        </Link>
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && orgs && orgs.length === 0 && (
        <EmptyState
          title="You're not part of any organization yet"
          description="Create one to donate or claim food on behalf of a business, NGO, or food bank."
          action={
            <Link to="/organizations/new">
              <Button variant="secondary">Create an organization</Button>
            </Link>
          }
        />
      )}

      {!loading && !error && orgs && orgs.length > 0 && (
        <div className="flex flex-col gap-3">
          {orgs.map((org) => (
            <Link
              key={org.id}
              to={`/organizations/${org.id}`}
              className="rounded-2xl border border-base-700 bg-base-900 shadow-card p-5 transition-colors hover:border-base-600"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-100">{org.name}</p>
                  <p className="mt-0.5 text-sm text-ink-500">{ORG_TYPE_LABELS[org.orgType]}</p>
                </div>
                <span className={`text-sm ${VERIFICATION_BADGE[org.verificationStatus]}`}>
                  {ORG_VERIFICATION_LABELS[org.verificationStatus]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
