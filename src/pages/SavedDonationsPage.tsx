import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchSavedDonations } from '../api/savedDonations';
import { fetchPrimaryImageUrls } from '../api/donations';
import { DonationCard } from '../components/donations/DonationCard';
import { DonationGridSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';

export function SavedDonationsPage() {
  const { session } = useAuth();
  const { data: donations, loading, error, refetch } = useAsyncData(
    () => fetchSavedDonations(session!.user.id),
    [session?.user.id]
  );
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!donations || donations.length === 0) return;
    let cancelled = false;
    fetchPrimaryImageUrls(donations.map((d) => d.id)).then((urls) => {
      if (!cancelled) setImageUrls(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [donations]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Saved donations</h1>

      {loading && <DonationGridSkeleton count={4} />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && donations && donations.length === 0 && (
        <EmptyState title="Nothing saved yet" description="Bookmark donations from the browse page to find them here later." />
      )}

      {donations && donations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {donations.map((d) => (
            <DonationCard key={d.id} donation={d} linkTo={`/donations/${d.id}`} imageUrl={imageUrls[d.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
