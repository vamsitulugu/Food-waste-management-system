import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Truck } from 'lucide-react';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { useGeolocation } from '../hooks/useGeolocation';
import { useDonationImages } from '../hooks/useDonationImages';
import { useToast } from '../context/ToastContext';
import { fetchOpenTasks, acceptPickupTask } from '../api/tasks';
import { Button } from '../components/common/Button';
import { ListRowSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';
import { DeliveriesTabs } from '../components/volunteer/DeliveriesTabs';
import { DeliveryTaskCard } from '../components/volunteer/DeliveryTaskCard';
import { getErrorMessage } from '../utils/errors';
import { distanceMeters } from '../utils/formatDistance';

export function VolunteerTasksPage() {
  const { data: tasks, loading, error, refetch } = useAsyncData(fetchOpenTasks);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState<string | null>(null);
  const { coords, loading: locLoading, error: locError, requestLocation } = useGeolocation();

  // Ask for location once so cards can show "2.4 km away" (volunteers choose nearby tasks).
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const images = useDonationImages((tasks ?? []).map((t) => t.donation.id));

  // Realtime: new tasks appear, accepted ones disappear. No filter — a task leaving 'open' must also trigger it.
  useRealtimeTable('pickup_tasks', refetch);

  async function handleAccept(taskId: string) {
    setAccepting(taskId);
    try {
      await acceptPickupTask(taskId);
      showToast('success', 'Delivery accepted. Update its progress from here.');
      navigate('/volunteer/my-tasks');
    } catch (err) {
      showToast('error', getErrorMessage(err, 'This task is no longer available.'));
      refetch();
    } finally {
      setAccepting(null);
    }
  }

  const sorted = [...(tasks ?? [])].sort((a, b) => {
    if (!coords) return 0;
    return distanceMeters(coords, a.donation) - distanceMeters(coords, b.donation);
  });

  return (
    <div className="flex flex-col gap-6">
      <DeliveriesTabs />
      <div>
        <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Open delivery tasks</h1>
        <p className="mt-1 text-sm text-ink-500">
          Recipients who can't collect food themselves need a volunteer. Pick one near you.
        </p>
        {!coords && (
          <button
            onClick={requestLocation}
            disabled={locLoading}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 disabled:opacity-60"
          >
            <MapPin size={13} />
            {locLoading ? 'Finding your location…' : locError ? `${locError} Try again` : 'Show distance from me'}
          </button>
        )}
        {coords && <p className="mt-2 text-xs text-ink-500">Sorted nearest first.</p>}
      </div>

      {loading && !tasks && (
        <div className="flex flex-col gap-3">
          <ListRowSkeleton />
          <ListRowSkeleton />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && tasks && tasks.length === 0 && (
        <EmptyState
          icon={<Truck size={26} strokeWidth={1.5} />}
          title="No open delivery tasks right now"
          description="A task appears here when a donor accepts a request where the recipient asked for volunteer delivery. New ones show up live."
        />
      )}

      {sorted.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((t) => (
            <DeliveryTaskCard
              key={t.id}
              task={t}
              imageUrl={images[t.donation.id]}
              distanceM={coords ? distanceMeters(coords, t.donation) : undefined}
            >
              <Button loading={accepting === t.id} onClick={() => handleAccept(t.id)}>
                Accept task
              </Button>
            </DeliveryTaskCard>
          ))}
        </div>
      )}
    </div>
  );
}
