import { useQuery } from "@tanstack/react-query";
import { getAvailablePlans } from "../api/vendor/vendor.api";
import { queryKeys } from "../lib/queryClient";

/**
 * Subscription-plans catalogue, served stale-while-revalidate from
 * TanStack Query. AuthContext's post-login useEffect calls
 * `queryClient.prefetchQuery` against the same key, so by the time
 * the vendor opens Choose-Your-Plan or the payment step the cache
 * is already warm and `data` arrives synchronously — no spinner.
 *
 * Pre-warm pairing: once the plans land, AuthContext also fires
 * `fetchAppleSubscriptions(allSkus)` so the StoreKit pre-flight on
 * PaymentMethodStep ("Checking with the App Store…") resolves
 * instantly from StoreKit's internal product cache instead of
 * round-tripping to Apple on every screen mount.
 *
 * Stale window: inherits the 60s default from queryClient. Plans
 * almost never change during a session; the in-flight refetch is
 * just a safety net for the rare case where an admin updates a
 * plan mid-session.
 */
export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans(),
    queryFn: getAvailablePlans,
  });
}
