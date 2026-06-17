import { apiClient } from "../client";
import {
  CustomerSegment,
  CustomerSegmentResponse,
  InsightCard,
  InsightFeed,
  InsightFeedResponse,
} from "./insights.types";

const EMPTY_FEED: InsightFeed = { cards: [], generatedAtUtc: "" };

/**
 * Ranked insight feed for the Home carousel. Like the promo carousel,
 * any non-200 yields an empty feed so the carousel simply doesn't render
 * (validateStatus keeps 401s on the refresh-token path, not the throw
 * path).
 */
export const getInsightsFeed = async (): Promise<InsightFeed> => {
  const response = await apiClient.get<InsightFeedResponse>("/insights/feed", {
    validateStatus: () => true,
  });
  if (response.data?.code !== "200" || !response.data?.data) return EMPTY_FEED;
  const data = response.data.data;
  return {
    cards: Array.isArray(data.cards) ? (data.cards as InsightCard[]) : [],
    generatedAtUtc: data.generatedAtUtc ?? "",
  };
};

/**
 * Mark an insight card as acted-on / dismissed so the carousel stops
 * surfacing it. Fire-and-forget; failure just means it reappears.
 */
export const dismissInsight = async (cardId: string): Promise<void> => {
  try {
    await apiClient.post(
      "/insights/dismiss",
      null,
      { params: { id: cardId }, validateStatus: () => true },
    );
  } catch {
    /* non-critical */
  }
};

/**
 * A customer segment (best | vip | lapsed_60d | lapsed_90d | one_time |
 * all) for the filtered Customers view + wa.me broadcast.
 */
export const getCustomerSegment = async (
  segment: string,
  take = 200,
): Promise<CustomerSegment> => {
  const response = await apiClient.get<CustomerSegmentResponse>(
    "/insights/customers/segment",
    { params: { segment, take }, validateStatus: () => true },
  );
  if (response.data?.code !== "200" || !response.data?.data) {
    return { segment, label: "Customers", totalCount: 0, customers: [] };
  }
  return response.data.data;
};
