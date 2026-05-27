import { useQuery } from "@tanstack/react-query";
import { getActivePromoCards } from "../api/promoCards/promoCards.api";

export const PROMO_CARDS_KEY = "promo-cards-active";

/**
 * Fetches the active dashboard promo cards. Empty list ⇒ the
 * carousel doesn't render at all (zero footprint on dashboards
 * with no scheduled cards). Cached at the default 60s staleTime
 * so navigating back to Home doesn't re-fetch on every mount.
 */
export const usePromoCards = () => {
  return useQuery({
    queryKey: [PROMO_CARDS_KEY],
    queryFn: getActivePromoCards,
    // Promo content changes infrequently — a longer stale window
    // keeps the dashboard snappy and the network quiet.
    staleTime: 5 * 60 * 1000,
  });
};
