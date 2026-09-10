import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { useToast } from '../context/ToastContext';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../api/notifications';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';

export function NotificationsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { data: notifications, loading, error, refetch } = useAsyncData(
    () => fetchNotifications(session!.user.id),
    [session?.user.id]
  );

  useRealtimeTable('notifications', refetch, { filter: `recipient_id=eq.${session?.user.id}` });

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead(session!.user.id);
      refetch();
    } catch {
      showToast('error', 'Could not mark all as read.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNotification(id);
      refetch();
    } catch {
      showToast('error', 'Could not delete notification.');
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id);
      refetch();
    } catch {
      showToast('error', 'Could not update notification.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink-100">Notifications</h1>
        {notifications && notifications.some((n) => !n.isRead) && (
          <Button variant="secondary" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {loading && <LoadingSpinner label="Loading notifications" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && notifications && notifications.length === 0 && (
        <EmptyState title="No notifications yet" />
      )}

      {notifications && notifications.length > 0 && (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-3 rounded-md border p-4
                ${n.isRead ? 'border-base-700 bg-base-900' : 'border-brand-500/30 bg-brand-700/10'}`}
            >
              <div>
                <p className="text-sm text-ink-100">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-ink-500">{n.body}</p>}
                <p className="mt-1 text-xs text-ink-700">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 gap-3">
                {!n.isRead && (
                  <button onClick={() => handleMarkRead(n.id)} className="text-xs text-brand-400 hover:text-brand-300">
                    Mark read
                  </button>
                )}
                <button onClick={() => handleDelete(n.id)} className="text-xs text-ink-700 hover:text-danger-400">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
