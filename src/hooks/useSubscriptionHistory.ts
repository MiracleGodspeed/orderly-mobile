import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getSubscriptionHistory } from "../api/vendor/vendor.api";
import { SubscriptionHistory } from "../api/vendor/vendor.types";

const HISTORY_KEY = ["subscription-history"] as const;

// Persisted snapshot of the most recent good response. On cold app
// start the SubscriptionBilling screen can render against this
// snapshot instantly while the live refetch runs in the background
// — vendors no longer see a long skeleton-loading state before they
// can read their plan status. The cache is overwritten only when a
// new SUCCESSFUL fetch lands; failed fetches preserve the prior good
// answer instead of nuking it to an empty array.
const CACHE_KEY = "orderly:subscription-history-cache:v1";

const PAGE_SIZE = 20;

/**
 * Cached, stale-while-revalidate fetch of the current vendor's
 * subscription history. Used by SubscriptionBilling and any other
 * surface that wants the plan + billing timeline.
 *
 * - First mount on a cold app: hydrates from AsyncStorage so the UI
 *   renders against the previous session's data immediately; a
 *   network refetch runs in parallel and replaces the cached set
 *   when it lands.
 * - Subsequent mounts within `staleTime`: served from TanStack
 *   in-memory cache, zero network.
 * - After `staleTime`: served from cache instantly, refetched in
 *   the background. The UI never blanks out.
 * - Pull-to-refresh: caller invokes `refetch()` directly to force a
 *   fresh fetch regardless of stale time.
 *
 * Invalidate via `useInvalidateSubscriptionHistory()` after a
 * payment confirms so the new "Active" row shows immediately on
 * the next render of SubscriptionBilling.
 */
export function useSubscriptionHistory() {
  const [persisted, setPersisted] = useState<SubscriptionHistory[] | null>(null);
  const [persistedHydrated, setPersistedHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setPersisted(JSON.parse(raw) as SubscriptionHistory[]);
          } catch {
            // Corrupt cache — ignore. The live query repopulates.
          }
        }
      })
      .finally(() => setPersistedHydrated(true));
  }, []);

  const query = useQuery({
    queryKey: HISTORY_KEY,
    queryFn: () => getSubscriptionHistory({ pageIndex: 1, pageSize: PAGE_SIZE }),
    // 30s stale window — subscription state changes rarely (renewal,
    // upgrade, cancel) and any of those paths explicitly invalidates
    // the cache. A 30s window means rapid back-and-forward navigation
    // serves instantly from memory; a fresh visit after that triggers
    // a background refetch but still renders the cached set first.
    staleTime: 30 * 1000,
    // Keep the cached set for an hour even when no component is
    // mounting it — covers cases like navigating to a deep screen
    // and back through the stack.
    gcTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(query.data)).catch(() => {
        // Storage failure is non-fatal — TanStack Query keeps the
        // in-memory copy regardless.
      });
    }
  }, [query.data]);

  // Effective response: prefer live, fall back to persisted snapshot
  // while the network is in flight. Empty array as last resort so
  // the consumer never has to handle `undefined`.
  const history: SubscriptionHistory[] = query.data ?? persisted ?? [];

  // `isLoading` is true only when there's literally nothing to show
  // — first install with no persisted snapshot AND no network response
  // yet. Subsequent visits never set this true because the persisted
  // snapshot satisfies "we have something to render".
  const isLoading =
    !query.data &&
    !persisted &&
    (query.isLoading || !persistedHydrated);

  return {
    history,
    isLoading,
    // Distinct from isLoading — true whenever a network refetch is
    // running, even when we already have data to show. Useful for a
    // small "Refreshing…" indicator without hiding the data.
    isFetching: query.isFetching,
    refetch: query.refetch,
    error: query.error,
  };
}

/**
 * Invalidate-and-refetch helper. Call after any operation that
 * changes subscription state on the server — Paystack success,
 * Apple Pay verify-receipt, manual cancel from admin, etc.
 */
export function useInvalidateSubscriptionHistory() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: HISTORY_KEY });
    // Drop the persisted snapshot too so a stale answer from before
    // the upgrade can't briefly win against the in-flight refetch on
    // the next render.
    AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
  };
}
