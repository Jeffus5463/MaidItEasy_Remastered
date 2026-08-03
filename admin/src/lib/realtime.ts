// Realtime is used purely as a React Query invalidation signal (Phase 6,
// BUILD_PLAN.md) — never a second data source. On a postgres_changes event
// we invalidate the given query key and let the existing hook refetch
// through RLS, so an admin session can never be shown a row it isn't
// authorized to see over the realtime channel either.
//
// Mirrors src/lib/realtime.ts in the Expo app — not shared code (this app
// doesn't share modules with the Expo app), same implementation.
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

// `filter` is undefined when the caller wants no row-level filter at all
// (e.g. an admin subscribing to every booking) — pass `null` explicitly for
// that case; `undefined` means "not ready yet, don't subscribe."
export function useRealtimeInvalidate(table: string, filter: string | null | undefined, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  const queryKeyJson = JSON.stringify(queryKey);

  useEffect(() => {
    if (filter === undefined) return;

    // Channel name is derived from table + filter + the query key so two
    // independent subscriptions can never collide on the same channel name
    // — removeChannel() on one can't accidentally tear down another.
    const name = `${table}:${filter ?? 'all'}:${queryKeyJson}`;

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
      .on(
        'postgres_changes',
        filter ? { event: '*', schema: 'public', table, filter } : { event: '*', schema: 'public', table },
        () => {
          queryClient.invalidateQueries({ queryKey: JSON.parse(queryKeyJson) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, queryKeyJson, queryClient]);
}
