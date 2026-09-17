import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { useGeolocation } from '../hooks/useGeolocation';
import { fetchAvailableDonations, fetchNearbyDonations, fetchPrimaryImageUrls } from '../api/donations';
import type { BrowseFilters } from '../api/donations';
import { DonationCard } from '../components/donations/DonationCard';
import { DonationFilters } from '../components/donations/DonationFilters';
import { DonationGridSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';

const NEARBY_RADIUS_M = 15000;

export function BrowsePage() {
  const [filters, setFilters] = useState<BrowseFilters>({ sortBy: 'newest' });
  const [nearbyMode, setNearbyMode] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const { coords, loading: locLoading, error: locError, requestLocation } = useGeolocation();

  const {
    data: donations,
    loading,
    error,
    refetch,
  } = useAsyncData(
    () =>
      nearbyMode && coords
        ? fetchNearbyDonations(coords.latitude, coords.longitude, NEARBY_RADIUS_M)
        : fetchAvailableDonations(filters),
    [nearbyMode, coords?.latitude, coords?.longitude, filters.category, filters.isVegetarian, filters.search, filters.sortBy]
  );

  useRealtimeTable('donations', refetch, { filter: 'status=eq.available' });

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

  const visible =
    nearbyMode && donations
      ? donations.filter((d) => {
          if (filters.category && d.category !== filters.category) return false;
          if (filters.isVegetarian !== undefined && d.isVegetarian !== filters.isVegetarian) return false;
          if (filters.search && !d.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
          return true;
        })
      : donations;

  function toggleNearby() {
    if (!nearbyMode) requestLocation();
    setNearbyMode((v) => !v);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink-100">Find food near you</h1>
          <p className="mt-1 text-sm text-ink-500">Surplus food currently available for pickup.</p>
        </div>
        <Button
          variant={nearbyMode ? 'primary' : 'secondary'}
          onClick={toggleNearby}
          loading={locLoading}
          className="inline-flex items-center gap-1.5"
        >
          <MapPin size={15} />
          {nearbyMode ? 'Near me (15km)' : 'Use my location'}
        </Button>
      </div>

      <DonationFilters filters={filters} onChange={setFilters} />
      {locError && <p className="text-sm text-danger-400">{locError}</p>}

      {loading && <DonationGridSkeleton count={6} />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && visible && visible.length === 0 && (
        <EmptyState
          title="No donations available right now"
          description="Check back soon, or widen your search."
        />
      )}

      {!loading && !error && visible && visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((d) => (
            <DonationCard key={d.id} donation={d} linkTo={`/donations/${d.id}`} imageUrl={imageUrls[d.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
