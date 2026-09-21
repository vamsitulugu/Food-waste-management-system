import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchMyDonations, fetchPrimaryImageUrls, isDonationStatusOf } from '../api/donations';
import { DonationCard } from '../components/donations/DonationCard';
import { DonationGridSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';

export function MyDonationsPage() {
  const { session } = useAuth();
  const { data: donations, loading, error, refetch } = useAsyncData(
    () => fetchMyDonations(session!.user.id),
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

  const active = donations?.filter((d) => isDonationStatusOf(d.status, 'active')) ?? [];
  const past = donations?.filter((d) => isDonationStatusOf(d.status, 'terminal')) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">My donations</h1>
        <Link to="/donations/new">
          <Button className="inline-flex items-center gap-1.5">
            <Plus size={16} /> Donate food
          </Button>
        </Link>
      </div>

      {loading && <DonationGridSkeleton count={4} />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && donations && donations.length === 0 && (
        <EmptyState
          title="You haven't donated anything yet"
          description="Post extra food with a photo and a few details — it takes less than a minute."
          action={
            <Link to="/donations/new">
              <Button>Donate your first meal</Button>
            </Link>
          }
        />
      )}

      {active.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-xl text-ink-100">Active</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((d) => (
              <DonationCard key={d.id} donation={d} linkTo={d.status === 'draft' ? `/donations/${d.id}/edit` : `/donations/${d.id}`} imageUrl={imageUrls[d.id]} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-xl text-ink-100">History</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((d) => (
              <DonationCard key={d.id} donation={d} linkTo={`/donations/${d.id}`} imageUrl={imageUrls[d.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
