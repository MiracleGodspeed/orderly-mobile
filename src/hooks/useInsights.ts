import { useQuery } from "@tanstack/react-query";
import {
  getCustomerSegment,
  getInsightsFeed,
} from "../api/insights/insights.api";

export const INSIGHTS_FEED_KEY = "insights-feed";
export const CUSTOMER_SEGMENT_KEY = "customer-segment";

/**
 * Growth Partner insight feed for the Home carousel. Empty feed ⇒ the
 * carousel doesn't render. Cached a few minutes so returning to Home is
 * instant; refetched on the same pull-to-refresh as the rest of Home.
 */
export const useInsights = () =>
  useQuery({
    queryKey: [INSIGHTS_FEED_KEY],
    queryFn: getInsightsFeed,
    staleTime: 3 * 60 * 1000,
  });

/** A customer segment (best | vip | lapsed_60d | lapsed_90d | one_time). */
export const useCustomerSegment = (segment?: string) =>
  useQuery({
    queryKey: [CUSTOMER_SEGMENT_KEY, segment],
    queryFn: () => getCustomerSegment(segment as string),
    enabled: !!segment,
    staleTime: 2 * 60 * 1000,
  });
