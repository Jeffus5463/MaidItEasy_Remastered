// Realtime is used purely as a React Query invalidation signal (Phase 6,
// BUILD_PLAN.md) — never a second data source. On a postgres_changes event
// we invalidate the given query key and let the existing hook refetch
// through RLS, so a customer/partner/admin can never be shown a row they
// aren't authorized to see even over the realtime channel.
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

// `filter` is undefined while the caller doesn't yet know what to subscribe
// to (e.g. a not-yet-loaded partner/booking id) — mirrors the `enabled`
// guard already used on the queries themselves; no subscription is opened
// until it's set.
export function useRealtimeInvalidate(table: string, filter: string | undefined, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  const queryKeyJson = JSON.stringify(queryKey);

  useEffect(() => {
    if (!filter) return;

    // Channel name is derived from table + filter + the query key so two
    // independent subscriptions can never collide on the same channel name
    // — removeChannel() on one can't accidentally tear down another.
    const name = `${table}:${filter}:${queryKeyJson}`;

    // Defensive: removeChannel() below sends an async "leave" over the
    // websocket rather than synchronously deregistering the channel. If this
    // effect re-runs (React StrictMode's double-invoke, Fast Refresh, or a
    // fast unmount/remount on navigation) before that leave completes,
    // supabase-js's channel() dedupes by topic and hands back the SAME
    // already-subscribed channel instead of a fresh one — and calling .on()
    // on an already-subscribed channel throws "cannot add postgres_changes
    // callbacks ... after subscribe()". Clear out any such leftover first.
    const stale = supabase.getChannels().find((c) => c.topic === `realtime:${name}`);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => {
        queryClient.invalidateQueries({ queryKey: JSON.parse(queryKeyJson) });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, queryKeyJson, queryClient]);
}
