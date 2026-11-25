import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
import { ListRowSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';
import { getNotificationTarget } from '../utils/notificationLink';
import type { AppNotification } from '../types/domain';

export function NotificationsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
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

  async function handleOpen(n: AppNotification) {
    const target = getNotificationTarget(n);
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
      } catch {
        // don't block navigation if marking read fails
      }
    }
    if (target) navigate(target.to);
    else refetch();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Notifications</h1>
        {notifications && notifications.some((n) => !n.isRead) && (
          <Button variant="secondary" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          <ListRowSkeleton />
          <ListRowSkeleton />
          <ListRowSkeleton />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && notifications && notifications.length === 0 && (
        <EmptyState title="No notifications yet" />
      )}

      {notifications && notifications.length > 0 && (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const target = getNotificationTarget(n);
            return (
              <div
                key={n.id}
                role={target ? 'link' : undefined}
                tabIndex={target ? 0 : undefined}
                onClick={target ? () => handleOpen(n) : undefined}
                onKeyDown={
                  target
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpen(n);
                        }
                      }
                    : undefined
                }
                className={`flex items-start justify-between gap-3 rounded-xl border p-4 transition-colors
                  ${n.isRead ? 'border-base-700 bg-base-900' : 'border-brand-500/30 bg-brand-700/10'}
                  ${target ? 'cursor-pointer hover:border-brand-500/60 hover:shadow-card' : ''}`}
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink-100">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-ink-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-ink-700">{new Date(n.createdAt).toLocaleString()}</p>
                  {target && (
                    <span className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-bold text-brand-400">
                      {target.label} <ChevronRight size={13} />
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-3">
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(n.id);
                      }}
                      className="text-xs text-brand-400 hover:text-brand-300"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n.id);
                    }}
                    className="text-xs text-ink-700 hover:text-danger-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
