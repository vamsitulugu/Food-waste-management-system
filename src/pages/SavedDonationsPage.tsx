import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchSavedDonations } from '../api/savedDonations';
import { fetchPrimaryImageUrls } from '../api/donations';
import { DonationCard } from '../components/donations/DonationCard';
import { SaveIconButton } from '../components/donations/SaveIconButton';
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
    fetchPrimaryImageUrls(donations.map((d) => d.id))
      .then((urls) => {
        if (!cancelled) setImageUrls(urls);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [donations]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Saved donations</h1>
        <p className="mt-1 text-sm text-ink-500">
          Tap the bookmark on any donation to keep it here. Food that is already taken is marked with its status.
        </p>
      </div>

      {loading && !donations && <DonationGridSkeleton count={3} />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && donations && donations.length === 0 && (
        <EmptyState
          icon={<Bookmark size={26} strokeWidth={1.5} />}
          title="Nothing saved yet"
          description="Look for the bookmark icon on a donation's photo to save it for later."
          action={
            <Link to="/browse" className="text-sm font-bold text-brand-400 hover:text-brand-300">
              Browse donations
            </Link>
          }
        />
      )}

      {donations && donations.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {donations.map((d) => (
            <DonationCard
              key={d.id}
              donation={d}
              linkTo={`/donations/${d.id}`}
              imageUrl={imageUrls[d.id]}
              saveControl={<SaveIconButton donationId={d.id} initialSaved onChange={(saved) => !saved && refetch()} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}
