import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadNotificationCount,
} from "../api/vendor/vendor.api";

const NOTIFICATIONS_KEY = ["notifications", "list"] as const;
const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;

/**
 * Fetches the bell-screen list. Cached aggressively so reopening the
 * screen feels instant — staleTime keeps the cache fresh-by-default and
 * the first 20 rows is plenty for the initial paint.
 */
export function useNotifications(pageSize = 20) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, { pageSize }],
    queryFn: () => getNotifications({ pageIndex: 1, pageSize }),
    // Fresh for 30s — opening the bell within that window reads from
    // cache instantly with no network.
    staleTime: 30 * 1000,
    // Keep cache for 10 min after last observer unmounts so bouncing
    // back to the screen still hits cache.
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Lightweight unread-count poller for the Home header badge. Refetches
 * every 60s in the background and on window focus so the badge stays
 * fresh without driving the full notifications fetch.
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadNotificationCount,
    // Cheap query (single COUNT against a covering index) — 60s cadence
    // is plenty fresh for a badge.
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Invalidates both the list and the badge so a mutation (mark-as-read,
 * mark-all-read) refreshes everywhere immediately.
 */
export function useInvalidateNotifications() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}
