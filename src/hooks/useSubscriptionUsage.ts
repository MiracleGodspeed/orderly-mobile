import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMySubscriptionUsage } from "../api/vendor/vendor.api";

const USAGE_KEY = ["my-subscription-usage"] as const;

/**
 * Fetches the vendor's plan limits and current usage (currently focused on
 * catalog item count, since that's the visible-on-mobile gate). Cached for
 * 60s — invalidate via `useInvalidateSubscriptionUsage()` after a successful
 * product create/delete so the cap counter stays accurate.
 */
export function useSubscriptionUsage() {
  return useQuery({
    queryKey: USAGE_KEY,
    queryFn: getMySubscriptionUsage,
    staleTime: 60 * 1000,
  });
}

export function useInvalidateSubscriptionUsage() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: USAGE_KEY });
}
