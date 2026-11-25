import { useCallback, useEffect, useState } from 'react';
import { fetchChatThreads } from '../api/chat';
import { useAuth } from '../context/AuthContext';
import { useRealtimeTable } from './useRealtimeTable';

/** Total unread chat messages for the signed-in user (for the nav badge). */
export function useUnreadChats() {
  const { session } = useAuth();
  const [count, setCount] = useState(0);
  const userId = session?.user.id;

  const load = useCallback(() => {
    if (!userId) return;
    fetchChatThreads()
      .then((threads) => setCount(threads.reduce((sum, t) => sum + t.unreadCount, 0)))
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // RLS makes realtime deliver only messages from chats the user is part of.
  useRealtimeTable('claim_messages', load, { event: 'INSERT' });
  // Reads are tracked via the notification being cleared; refresh on those too.
  useRealtimeTable('notifications', load, { filter: `recipient_id=eq.${userId ?? ''}` });

  return { count, refresh: load };
}
