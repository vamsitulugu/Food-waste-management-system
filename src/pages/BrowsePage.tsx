import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { useGeolocation } from '../hooks/useGeolocation';
import { fetchAvailableDonations, fetchNearbyDonations, fetchPrimaryImageUrls } from '../api/donations';
import type { BrowseFilters } from '../api/donations';
import { DonationCard } from '../components/donations/DonationCard';
import { DonationFilters } from '../components/donations/DonationFilters';
import { DonationGridSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';
import { DonateCard } from '../components/donations/DonateCard';
import { DonateModal } from '../components/donations/DonateModal';

const NEARBY_RADIUS_M = 15000;

export function BrowsePage() {
  const [filters, setFilters] = useState<BrowseFilters>({ sortBy: 'newest' });
  const [nearbyMode, setNearbyMode] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const { coords, loading: locLoading, error: locError, requestLocation } = useGeolocation();
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const effectiveFilters: BrowseFilters = { ...filters, search: debouncedSearch };

  const {
    data: donations,
    loading,
    error,
    refetch,
  } = useAsyncData(
    () =>
      nearbyMode && coords
        ? fetchNearbyDonations(coords.latitude, coords.longitude, NEARBY_RADIUS_M)
        : fetchAvailableDonations(effectiveFilters),
    [nearbyMode, coords?.latitude, coords?.longitude, filters.category, filters.isVegetarian, debouncedSearch, filters.sortBy]
  );

  // No status filter: we also need the UPDATE that takes a donation out of 'available'.
  useRealtimeTable('donations', refetch);

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

  const waitingForLocation = nearbyMode && !coords;
  const visible =
    waitingForLocation
      ? []
      : nearbyMode && donations
      ? donations.filter((d) => {
          if (filters.category && d.category !== filters.category) return false;
          if (filters.isVegetarian !== undefined && d.isVegetarian !== filters.isVegetarian) return false;
          if (debouncedSearch && !d.title.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
          return true;
        })
      : donations;

  function toggleNearby() {
    if (!nearbyMode) requestLocation();
    setNearbyMode((v) => !v);
  }

  // If location is denied/unavailable, fall back to the full list instead of an empty page.
  const showLocationFallback = nearbyMode && !coords && !locLoading && Boolean(locError);

  return (
    <div className="flex flex-col gap-7">
      <DonateCard onClick={() => setDonateOpen(true)} />
      <DonateModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        onPosted={() => {
          setDonateOpen(false);
          refetch();
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">
            {nearbyMode && coords ? 'Available food near you' : 'Available food'}
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-500">Surplus food currently available for pickup.</p>
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

      {showLocationFallback && (
        <p className="text-sm text-ink-500">We couldn't get your location, so nearby mode is off. Turn it off to see all food.</p>
      )}
      {loading && !donations && <DonationGridSkeleton count={6} />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!(loading && !donations) && !error && !waitingForLocation && visible && visible.length === 0 && (
        <EmptyState
          title="No donations available right now"
          description="Check back soon, or widen your search."
        />
      )}

      {!error && visible && visible.length > 0 && (
        <div>
          <h2 className={`mb-4 font-display text-xl text-ink-100 ${loading ? 'opacity-60' : ''}`}>
            {visible.length} {visible.length === 1 ? 'donation' : 'donations'} available
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((d) => (
              <DonationCard key={d.id} donation={d} linkTo={`/donations/${d.id}`} imageUrl={imageUrls[d.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
