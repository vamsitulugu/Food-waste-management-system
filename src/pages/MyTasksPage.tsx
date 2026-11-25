import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { useDonationImages } from '../hooks/useDonationImages';
import { fetchMyTasks } from '../api/tasks';
import { TaskStatusStepper } from '../components/volunteer/TaskStatusStepper';
import { ListRowSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';
import { DeliveriesTabs } from '../components/volunteer/DeliveriesTabs';
import { DeliveryTaskCard } from '../components/volunteer/DeliveryTaskCard';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export function MyTasksPage() {
  const { session } = useAuth();
  const { data: tasks, loading, error, refetch } = useAsyncData(
    () => fetchMyTasks(session!.user.id),
    [session?.user.id]
  );

  useRealtimeTable('pickup_tasks', refetch, { filter: `volunteer_id=eq.${session?.user.id}` });

  const active = tasks?.filter((t) => t.status !== 'delivered' && t.status !== 'cancelled') ?? [];
  const past = tasks?.filter((t) => t.status === 'delivered' || t.status === 'cancelled') ?? [];
  const images = useDonationImages((tasks ?? []).map((t) => t.donationId));

  return (
    <div className="flex flex-col gap-8">
      <DeliveriesTabs />
      <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">My delivery tasks</h1>

      {loading && !tasks && (
        <div className="flex flex-col gap-3">
          <ListRowSkeleton />
          <ListRowSkeleton />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && tasks && tasks.length === 0 && (
        <EmptyState
          title="No deliveries yet"
          description="Accept an open delivery from the Available tab to get started."
          action={
            <Link to="/volunteer/tasks" className="text-sm font-bold text-brand-400 hover:text-brand-300">
              See available tasks
            </Link>
          }
        />
      )}

      {active.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-300">Active ({active.length})</h2>
          <div className="flex flex-col gap-4">
            {active.map((t) => (
              <div key={t.id} className="flex flex-col gap-2">
                <DeliveryTaskCard task={t} imageUrl={images[t.donationId]} showStatus>
                  <Link
                    to="/chats"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand-500/40 px-3 py-2 text-xs font-bold text-brand-400 hover:bg-brand-700/10"
                  >
                    <MessageCircle size={13} /> Chat
                  </Link>
                </DeliveryTaskCard>
                <div className="rounded-2xl border border-base-700 bg-base-900 p-4 shadow-card">
                  <TaskStatusStepper task={t} onChange={refetch} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-300">History ({past.length})</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {past.map((t) => (
              <DeliveryTaskCard key={t.id} task={t} imageUrl={images[t.donationId]} showStatus />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
