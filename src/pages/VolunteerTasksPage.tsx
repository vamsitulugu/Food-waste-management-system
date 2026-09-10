import { useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { useToast } from '../context/ToastContext';
import { fetchOpenTasks, acceptPickupTask } from '../api/tasks';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/common/States';

export function VolunteerTasksPage() {
  const { data: tasks, loading, error, refetch } = useAsyncData(fetchOpenTasks);
  const { showToast } = useToast();
  const [accepting, setAccepting] = useState<string | null>(null);

  useRealtimeTable('pickup_tasks', refetch, { filter: 'status=eq.open' });

  async function handleAccept(taskId: string) {
    setAccepting(taskId);
    try {
      await acceptPickupTask(taskId);
      showToast('success', 'Task accepted. Check "My tasks" to get started.');
      refetch();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'This task is no longer available.');
      refetch();
    } finally {
      setAccepting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink-100">Open delivery tasks</h1>
        <p className="mt-1 text-sm text-ink-500">Help bridge the gap between a donor and a recipient.</p>
      </div>

      {loading && <LoadingSpinner label="Loading tasks" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && tasks && tasks.length === 0 && (
        <EmptyState title="No open tasks right now" description="Check back soon." />
      )}

      {tasks && tasks.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {tasks.map((t) => (
            <div key={t.id} className="rounded-lg border border-base-700 bg-base-900 p-5">
              <p className="font-medium text-ink-100">{t.donation.title}</p>
              <p className="mt-1 text-sm text-ink-500">{t.donation.pickupAddress}</p>
              <Button className="mt-3" loading={accepting === t.id} onClick={() => handleAccept(t.id)}>
                Accept task
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
