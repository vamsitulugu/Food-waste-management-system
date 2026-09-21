import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { fetchMyClaims } from '../api/claims';
import { fetchPrimaryImageUrls } from '../api/donations';
import { ClaimStatusBadge } from '../components/claims/ClaimStatusBadge';
import { ListRowSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';
import { FULFILLMENT_METHOD_LABELS } from '../types/domain';

export function MyClaimsPage() {
  const { session } = useAuth();
  const { data: claims, loading, error, refetch } = useAsyncData(
    () => fetchMyClaims(session!.user.id),
    [session?.user.id]
  );

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!claims || claims.length === 0) return;
    let cancelled = false;
    fetchPrimaryImageUrls(claims.map((c) => c.donationId))
      .then((urls) => {
        if (!cancelled) setImageUrls(urls);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [claims]);

  useRealtimeTable('donation_claims', refetch, { filter: `claimant_id=eq.${session?.user.id}` });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">My requests</h1>
        <p className="mt-1 text-sm text-ink-500">Donations you've claimed or requested.</p>
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && claims && claims.length === 0 && (
        <EmptyState
          title="No requests yet"
          description="Browse available donations to make your first request."
          action={
            <Link to="/browse" className="text-sm font-bold text-brand-400 hover:text-brand-300">
              Browse donations
            </Link>
          }
        />
      )}

      {claims && claims.length > 0 && (
        <div className="flex flex-col gap-3">
          {claims.map((c) => (
            <Link
              key={c.id}
              to={`/donations/${c.donationId}`}
              className="group flex items-center gap-4 rounded-2xl bg-base-900 p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-base-800">
                {imageUrls[c.donationId] ? (
                  <img src={imageUrls[c.donationId]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-700/15 to-brand-600/10 text-brand-500/60">
                    <UtensilsCrossed size={22} strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base text-ink-100">{c.donation?.title ?? 'Donation'}</p>
                <p className="mt-0.5 text-xs font-medium text-ink-500">{FULFILLMENT_METHOD_LABELS[c.fulfillmentMethod]}</p>
                <div className="mt-2">
                  <ClaimStatusBadge status={c.status} />
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-700 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
