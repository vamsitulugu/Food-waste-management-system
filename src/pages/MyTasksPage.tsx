import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { fetchMyTasks } from '../api/tasks';
import { TaskStatusStepper } from '../components/volunteer/TaskStatusStepper';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/common/States';

export function MyTasksPage() {
  const { session } = useAuth();
  const { data: tasks, loading, error, refetch } = useAsyncData(
    () => fetchMyTasks(session!.user.id),
    [session?.user.id]
  );

  useRealtimeTable('pickup_tasks', refetch, { filter: `volunteer_id=eq.${session?.user.id}` });

  const active = tasks?.filter((t) => t.status !== 'delivered' && t.status !== 'cancelled') ?? [];
  const past = tasks?.filter((t) => t.status === 'delivered' || t.status === 'cancelled') ?? [];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl text-ink-100">My delivery tasks</h1>

      {loading && <LoadingSpinner label="Loading tasks" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && tasks && tasks.length === 0 && (
        <EmptyState title="No tasks yet" description="Accept an open task to get started." />
      )}

      {active.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-ink-300">Active</h2>
          <div className="flex flex-col gap-3">
            {active.map((t) => (
              <div key={t.id} className="rounded-lg border border-base-700 bg-base-900 p-5">
                <p className="font-medium text-ink-100">{t.donation?.title}</p>
                <p className="mt-1 text-sm text-ink-500">{t.donation?.pickupAddress}</p>
                <div className="mt-3">
                  <TaskStatusStepper task={t} onChange={refetch} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-ink-300">History</h2>
          <div className="flex flex-col gap-3">
            {past.map((t) => (
              <div key={t.id} className="rounded-lg border border-base-700 bg-base-900 p-5">
                <p className="font-medium text-ink-100">{t.donation?.title}</p>
                <p className="mt-1 text-xs text-ink-500">{t.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
