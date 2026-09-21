import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { fetchNotifications, fetchUnreadCount, markNotificationRead } from '../../api/notifications';
import type { AppNotification } from '../../types/domain';

export function NotificationBell() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<AppNotification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    if (!session?.user) return;
    const [count, list] = await Promise.all([
      fetchUnreadCount(session.user.id),
      fetchNotifications(session.user.id),
    ]);
    setUnread(count);
    setRecent(list.slice(0, 8));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  useRealtimeTable('notifications', refresh, { filter: `recipient_id=eq.${session?.user.id}` });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
  }

  async function handleItemClick(n: AppNotification) {
    if (!n.isRead) {
      await markNotificationRead(n.id);
      refresh();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-full p-2 text-ink-300 hover:bg-base-800 hover:text-ink-100"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-base-700 bg-base-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-base-700 px-4 py-3">
            <p className="text-sm font-medium text-ink-100">Notifications</p>
            <Link to="/notifications" className="text-xs text-brand-400 hover:text-brand-300" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-500">No notifications yet.</p>}
            {recent.map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`block w-full border-b border-base-800 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-base-850
                  ${n.isRead ? 'text-ink-500' : 'text-ink-100'}`}
              >
                <p>{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-ink-500">{n.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
