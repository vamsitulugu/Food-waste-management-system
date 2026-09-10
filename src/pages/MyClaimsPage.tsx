import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { fetchMyClaims } from '../api/claims';
import { ClaimStatusBadge } from '../components/claims/ClaimStatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/common/States';
import { FULFILLMENT_METHOD_LABELS } from '../types/domain';

export function MyClaimsPage() {
  const { session } = useAuth();
  const { data: claims, loading, error, refetch } = useAsyncData(
    () => fetchMyClaims(session!.user.id),
    [session?.user.id]
  );

  useRealtimeTable('donation_claims', refetch, { filter: `claimant_id=eq.${session?.user.id}` });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink-100">My requests</h1>
        <p className="mt-1 text-sm text-ink-500">Donations you've claimed or requested.</p>
      </div>

      {loading && <LoadingSpinner label="Loading requests" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && claims && claims.length === 0 && (
        <EmptyState
          title="No requests yet"
          description="Browse available donations to make your first request."
          action={
            <Link to="/browse" className="text-sm text-brand-400 hover:text-brand-300">
              Browse donations
            </Link>
          }
        />
      )}

      {claims && claims.length > 0 && (
        <div className="flex flex-col gap-2">
          {claims.map((c) => (
            <Link
              key={c.id}
              to={`/donations/${c.donationId}`}
              className="flex items-center justify-between rounded-md border border-base-700 bg-base-900 p-4 hover:border-base-600"
            >
              <div>
                <p className="text-sm text-ink-100">{c.donation?.title ?? 'Donation'}</p>
                <p className="mt-0.5 text-xs text-ink-500">{FULFILLMENT_METHOD_LABELS[c.fulfillmentMethod]}</p>
              </div>
              <ClaimStatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
