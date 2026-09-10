import { useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { useGeolocation } from '../hooks/useGeolocation';
import { fetchAvailableDonations, fetchNearbyDonations } from '../api/donations';
import type { BrowseFilters } from '../api/donations';
import { DonationCard } from '../components/donations/DonationCard';
import { DonationFilters } from '../components/donations/DonationFilters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';

const NEARBY_RADIUS_M = 15000;

export function BrowsePage() {
  const [filters, setFilters] = useState<BrowseFilters>({ sortBy: 'newest' });
  const [nearbyMode, setNearbyMode] = useState(false);
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
      <div>
        <h1 className="font-display text-2xl text-ink-100">Available donations</h1>
        <p className="mt-1 text-sm text-ink-500">Browse surplus food currently available for pickup.</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <DonationFilters filters={filters} onChange={setFilters} />
        <Button variant={nearbyMode ? 'primary' : 'secondary'} onClick={toggleNearby} loading={locLoading}>
          {nearbyMode ? 'Showing nearby (15km)' : 'Show donations near me'}
        </Button>
      </div>
      {locError && <p className="text-sm text-danger-400">{locError}</p>}

      {loading && <LoadingSpinner label="Loading donations" />}
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
            <DonationCard key={d.id} donation={d} linkTo={`/donations/${d.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
