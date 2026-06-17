// Growth Partner insights — mirror of the .NET Insights DTOs
// (camelCased on the wire). See docs/growth-partner-vision.md.

export interface InsightCard {
  id: string;
  kind: string;
  tone: "positive" | "neutral" | "warning" | "celebrate" | string;
  headline: string;
  body: string;
  ctaLabel?: string | null;
  /** semantic route: customers | orders | product | products | reports | none */
  route: string;
  routeParams: Record<string, string>;
  priority: number;
  value?: number | null;
}

export interface InsightFeed {
  cards: InsightCard[];
  generatedAtUtc: string;
}

export interface InsightFeedResponse {
  code: string;
  message: string;
  data: InsightFeed;
}

export interface SegmentCustomer {
  name: string;
  email: string;
  phoneNumber: string;
  totalSpent: number;
  totalOrders: number;
  lastPurchaseUtc: string | null;
  daysSinceLastPurchase: number | null;
}

export interface CustomerSegment {
  segment: string;
  label: string;
  totalCount: number;
  customers: SegmentCustomer[];
}

export interface CustomerSegmentResponse {
  code: string;
  message: string;
  data: CustomerSegment;
}
