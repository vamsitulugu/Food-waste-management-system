import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { fetchNotifications, fetchUnreadCount, markNotificationRead } from '../../api/notifications';
import type { AppNotification } from '../../types/domain';
import { getNotificationTarget } from '../../utils/notificationLink';
import { ChevronRight } from 'lucide-react';

export function NotificationBell() {
  const { session } = useAuth();
  const navigate = useNavigate();
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
    const target = getNotificationTarget(n);
    setOpen(false);
    if (target) navigate(target.to);
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        refresh();
      } catch {
        // navigation already happened; read-state will sync on next refresh
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-300 hover:bg-base-800 hover:text-ink-100"
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
        <div className="fixed inset-x-3 top-[4.25rem] z-40 rounded-xl border border-base-700 bg-base-900 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-base-700 px-4 py-3">
            <p className="text-sm font-medium text-ink-100">Notifications</p>
            <Link to="/notifications" className="text-xs text-brand-400 hover:text-brand-300" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-500">No notifications yet.</p>}
            {recent.map((n) => {
              const target = getNotificationTarget(n);
              return (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full items-start gap-2 border-b border-base-800 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-base-850
                    ${n.isRead ? 'text-ink-500' : 'text-ink-100'}`}
                >
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                  <span className="min-w-0 flex-1">
                    <span className="block">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-xs text-ink-500">{n.body}</span>}
                    {target && <span className="mt-1 block text-xs font-bold text-brand-400">{target.label} →</span>}
                  </span>
                  {target && <ChevronRight size={16} className="mt-0.5 shrink-0 text-ink-700" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
