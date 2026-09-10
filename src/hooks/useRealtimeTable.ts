import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Subscribes to postgres_changes on one table, scoped by an optional filter
 * string (Supabase realtime filter syntax, e.g. "status=eq.available").
 * Calls `onChange` for every INSERT/UPDATE/DELETE event and tears the
 * channel down on unmount — callers should refetch or patch local state
 * from `onChange`, not assume the payload alone is enough to re-render.
 */
export function useRealtimeTable(
  table: string,
  onChange: () => void,
  options: { filter?: string; event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*' } = {}
) {
  const { filter, event = '*' } = options;

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}:${filter ?? 'all'}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, ...(filter ? { filter } : {}) },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, event]);
}
