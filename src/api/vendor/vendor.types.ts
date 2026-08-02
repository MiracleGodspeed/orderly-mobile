import { StoreData } from "../../../context/VendorContext";

export interface Category {
  id: number;
  name: string;
}

export interface VendorOnboardingRequest {
  storeId: string;
  businessName: string;
  description: string;
  applicableCategories: number[];
  isServiceBased: boolean;
  /** The store-URL variant the vendor picked (e.g. "bolu-couture"). The
   *  backend honours it only if it's a variant it would generate for this
   *  name, else falls back to the dashed default. Omit to let it decide. */
  selectedSlug?: string;
}

/** One store-URL candidate (+ availability) from
 *  GET /storefront/store-url-suggestions. */
export interface StoreUrlSuggestion {
  slug: string;
  available: boolean;
}

export interface StoreUrlSuggestionsResponse {
  message: string;
  code: string;
  data: StoreUrlSuggestion[] | null;
}

/** Newsletter dashboard header state. */
export interface NewsletterOverview {
  enabled: boolean;
  hasFeature: boolean;
  totalSubscribers: number;
}

export interface NewsletterOverviewResponse {
  message: string;
  code: string;
  data: NewsletterOverview | null;
}

/** One storefront newsletter subscriber. */
export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

export interface GetNewsletterSubscribersResponse {
  message: string;
  code: string;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  data: NewsletterSubscriber[] | null;
}

export interface VendorOnboardingResponse {
  message: string;
  code: string;
  data: boolean | null;
}

export interface GetCategoriesResponse {
  message: string;
  code: string;
  data: Category[];
}

/**
 * Vendor-defined categories used to group products INSIDE a single store
 * (e.g. "Summer Collection", "Featured"). Distinct from the platform-level
 * `Category` above which is used during onboarding.
 */
export interface CatalogCategory {
  id: number;
  name: string;
  description?: string | null;
}

export interface GetCatalogCategoriesResponse {
  message: string;
  code: string;
  data: CatalogCategory[];
}

export interface StorefrontDetailsData {
  storeId: string;
  storeName: string;
  slugUrl: string;
  isPublished: boolean;

  vendorOnboardProgressResponse: {
    addedFirstProduct: boolean;
    addedDeliveryLocations: boolean;
    updatedPersonsalProfile: boolean;
  };

  storeSubscription: {
    isTrial: boolean;
    daysRemaining: number;
    gracePeriodInDays: number;
  };
}


export interface GetStorefrontDetailsResponse {
  message: string;
  code: string;
  data: StoreData;
}

export interface UpdateStorefrontSettingsResponse {
  message: string;
  code: string;
  data: boolean;
}

/**
 * Per-variant price override. Either size or color (or both) may be empty
 * when the product only varies along one axis. `price` is what the
 * customer is charged for this exact combo; `stock` is optional
 * per-variant inventory (when null, falls back to product-level stock).
 */
export interface VariantPrice {
  size?: string | null;
  color?: string | null;
  price: number;
  stock?: number | null;
}

export interface Product {
  id: string;
  storeId: string;
  title: string;
  /** Human-readable category name from the legacy free-text field. Display only. */
  category: string;
  /** ID of the linked CatalogCategory. Use this to pre-select the category dropdown on edit. */
  catalogCategoryId?: number | null;
  catalogCategoryName?: string | null;
  description: string;
  originalPrice: number;
  percentDiscount: number | null;
  price: number;
  /** What the item costs the vendor per unit. Only ever populated on the
   *  authenticated vendor catalog read — the public storefront shares
   *  this shape and must never carry it. Null when untracked. */
  costPrice?: number | null;
  stock: number;
  sales: number | null;
  reviews: number;
  profit: number | null;
  margin: number | null;
  revenue: number | null;
  rating: number;
  // CatalogItemStatus on the API: Active = 1, Inactive = 2. With
  // JsonStringEnumConverter wired up, the wire shape is now the enum
  // NAME (e.g. "Active") rather than the integer. Allow both so older
  // builds still parse and so the UI can compare tolerantly.
  status: number | string;
  image: string | null;
  image2: string | null;
  lastSold: string | null;
  trending: boolean | null;
  badge: string;
  features: string[];
  colourOptions: string[];
  sizeOptions: string[];
  /** Optional per-variant price/stock overrides. Empty means the base
   *  `price` applies to every combination. */
  variantPrices?: VariantPrice[] | null;
  sku: string;
  slug: string;
  isAvailable: boolean;
  imageFile1: any | null;
  imageFile2: any | null;
  createdAt: string;
}

export interface GetProductsResponse {
  pageIndex: number;
  pageSize: number;
  code: string;
  message: string;
  totalCount: number;
  totalPages: number;
  data: Product[];
}

export interface CreateProductPayload {
  title: string;
  /** Vendor-defined catalog category ID. The backend expects this as
   *  `CatalogCategoryId` (long). Null/undefined leaves the product
   *  uncategorised. */
  catalogCategoryId?: number | null;
  /** Vendor's buying cost per unit. Undefined leaves it untouched;
   *  null clears it. Only sent when the store tracks cost price. */
  costPrice?: number | null;
  description: string;
  originalPrice: number;
  price: number;
  stock: number;
  badge?: string;
  features?: string[];
  sku?: string;
  colourOptions?: string[];
  sizeOptions?: string[];
  /** Per-variant price/stock overrides. Send `[]` to clear existing
   *  overrides; omit to leave them untouched is NOT supported — the
   *  backend treats undefined the same as `null` and clears them. */
  variantPrices?: VariantPrice[];
  imageFile1?: any;
  imageFile2?: any;
}

export interface UpdateProductPayload extends CreateProductPayload {
  id: string;
}


export type CatalogItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
};

/** Sales channel attribution for an order. Empty/null when the order
 *  came in through the public storefront (the default). */
export type OrderChannel =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'walkin'
  | 'phone'
  | 'twitter'
  | 'tiktok'
  | 'other';

/** Order-line status — what the vendor has done with the order so far.
 *  Orthogonal to payment status. Backend enum names are PascalCase; we
 *  type the wire format directly. */
export type OrderLineStatus =
  | 'pending'
  | 'Confirmed'
  | 'Processing'
  | 'Dispatched'
  | 'Delivered'
  | 'Cancelled';

export type Order = {
  id: string;
  orderNumber: string;
  status:
    | 'success'
    | 'pending'
    | 'failed'
    | 'pending_vendor_manual_confirmation'
    | 'pending_whatsapp_handoff';
  /** Row-level status driven by vendor actions like "Mark as Shipped".
   *  Unset for legacy rows where the backend hasn't been redeployed yet. */
  orderStatus?: OrderLineStatus;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerBackupPhone: string;
  fulfillmentType: 'pick-up' | 'delivery';
  deliveryAddress: string;
  deliveryCharge: number;
  state: string;
  lga: string;
  totalPrice: number;
  amountPaid: number;
  paidAt: string;
  createdAt: string;
  catalogItems: CatalogItem[];
  /** Set by vendor-logged offline orders (WhatsApp, walk-in, etc).
   *  Null/undefined for orders that came through the storefront. */
  channel?: OrderChannel | string | null;
  /** True when the vendor logged this order from the dashboard
   *  rather than it arriving via the storefront. */
  isManualEntry?: boolean;
};

export interface LogOfflineOrderRequest {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  channel: OrderChannel;
  markAsPaid?: boolean;
  notes?: string;
  items: {
    catalogItemId: string;
    quantity: number;
    unitPrice?: number;
    color?: string;
    size?: string;
  }[];
}

export type GetOrdersParams = {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  datefrom?: string;
  dateto?: string;
};

export type PaginatedOrdersResponse = {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  code: string;
  message: string;
  data: Order[];
};

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  extraInfo: string;
  features: string;
  requestLimitPerMonth: number | null;
  yearlyPecentageDiscount: number;
  quarterlyPecentageDiscount: number | null;
  catalogItemLimit: number | null;
  /** Plan-derived staff seat budget. Convention: 0 means staff
   *  accounts are not part of the plan, a positive integer caps the
   *  seat count, and null means unlimited (mirrors catalogItemLimit). */
  staffLimit: number | null;
  price: number;
  isPopular: boolean;
  badge: string | null;
  buttonText: string;
  buttonStyle: string;
  createdAt: string;
  lastUpdated: string | null;
  isActive: boolean;
  isDeleted: boolean;
}

export interface SubscriptionHistory {
  subscriptionPlanId: number;
  subscriptionPlan: SubscriptionPlan;
  startDate: string;
  expiryDate: string;
  subscriptionDuration: number;
  durationUnit: string;
  status: string;
  usedRequestCount: number | null;
  hasCustomDomain: boolean;
  isTrialPeriod: boolean;
  daysRemaining: number;
  gracePeriodInDays: number;
  isActive: boolean;
  amountPaid: number;
  paymentReference: string;
  paymentGateway: string | null;
  paidAt: string | null;
  createdAt: string;
  planFeatures: string[];
}

export interface SubscriptionHistoryParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  totalCount?: number;
  totalPages?: number;
}

export interface SubscriptionHistoryResponse {
  message: string;
  code: string;
  data: SubscriptionHistory[];
}

export interface ApiSubscriptionPlan {
  id: number;
  name: string;
  description: string;
  extraInfo: string;
  price: number;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  badge: string | null;
  buttonText: string;
  buttonStyle: string;
  // Apple In-App Purchase product identifiers, one per billing
  // cycle. Null/undefined means Apple Pay is not enabled for that
  // cycle of this plan — the iOS PaymentMethodStep hides the Apple
  // Pay button and the vendor uses Paystack instead. Populated by
  // an admin from App Store Connect after creating the matching
  // Auto-Renewable Subscription products.
  appleProductIdMonthly?: string | null;
  appleProductIdQuarterly?: string | null;
  appleProductIdYearly?: string | null;
  /** Machine-readable feature keys this plan grants (mirrors backend
   *  `SubscriptionPlan.FeatureKeys`). Null means unlimited. Used by
   *  the storefront template picker to know which plan owns which
   *  template for the trial info sheet. */
  featureKeys?: string[] | null;
}

export interface GetPlansResponse {
  message: string;
  code: string;
  data: ApiSubscriptionPlan[];
}

export interface CreateVendorSubscriptionPayload {
  subscriptionPlanId: number;
  subscriptionDuration: number;
  durationUnit: "months" | "weeks" | "days" | "hours";
  paymentMethod: "card" | "bank_transfer" | "saved_card";
  hasCustomDomain: boolean;
  callbackUrl: string;
  amount: number;
  isTrialPeriod: boolean;
  /** When true, the backend recomputes the prorated credit from the
   *  vendor's active subscription and deducts it from the Paystack
   *  charge. Sent after the vendor confirms the quote shown in the
   *  upgrade-preview step. Server is authoritative — it always
   *  recomputes the credit instead of trusting any amount we send. */
  applyProrationCredit?: boolean;
}

/** Mirrors the server's <c>SubscriptionUpgradeQuoteDto</c>. Drives
 *  the upgrade-preview step of the in-app subscription flow. */
export interface SubscriptionUpgradeQuote {
  currentPlanName?: string | null;
  currentPlanPrice: number;
  currentPlanExpiry?: string | null;
  currentPaymentGateway?: string | null;
  newPlanId: number;
  newPlanName: string;
  newPlanPrice: number;
  newDuration: number;
  newDurationUnit: string;
  newCyclePrice: number;
  unusedDays: number;
  totalDaysInCurrentCycle: number;
  prorationCredit: number;
  /** Total credit before the cap-at-new-cycle-price rule fires. Equals
   *  prorationCredit when the credit fits inside the new cycle's price.
   *  Used as the headline "credit earned" number in the preview. */
  rawCreditAvailable: number;
  /** Excess credit the vendor will lose by picking a new cycle whose
   *  price is lower than the credit they have. Non-zero is the foot-gun
   *  signal — UI surfaces it as a warning row so they make an informed
   *  choice. */
  forfeitedCredit: number;
  amountDue: number;
  newExpiryDate: string;
  isUpgrade: boolean;
  isSamePlan: boolean;
  isDowngrade: boolean;
  isAppleSubscription: boolean;
  canProceed: boolean;
  reason?: string | null;
}

export interface GetUpgradeQuotePayload {
  subscriptionPlanId: number;
  subscriptionDuration: number;
  durationUnit: "months" | "weeks" | "days" | "hours";
}

export interface CreateVendorSubscriptionData {
  /** Either a Paystack checkout URL OR the literal "is-charge-authorization"
      when the backend has already charged the saved card directly. */
  authorizationUrl: string;
  reference?: string;
}

export interface CreateVendorSubscriptionResponse {
  message: string;
  code: string;
  data: CreateVendorSubscriptionData;
}

export interface VerifyPaymentData {
  status: string; // "success" | "failed" | "pending"
  reference: string;
  amount?: number;
}


export interface BestSellingProduct {
  productId: string;
  productName: string;
  totalQuantitySold: number;
  category: string | null;
  unitPrice: number;
}

export interface TopCustomer {
  /** Customer's name from the most recent payment in the group.
   *  Empty string when no name was supplied — the UI is expected to
   *  fall back to email (or "N/A" if both are missing). */
  name: string;
  /** Always present — emails are the identity key used to group
   *  customers, so anything in the list has one. */
  email: string;
  /** Empty when none of the customer's orders carried a phone. */
  phoneNumber: string;
  /** Optional — empty string today, but kept on the type so the UI can
   *  surface a city/state once the backend starts deriving it from the
   *  customer's most-recent order. */
  location: string;
  totalOrders: number;
  totalAmount: number;
}

export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  /** Public-storefront visits in the selected period. Deduped on write
   *  (30-min window per IP+store) so this represents distinct visitor
   *  sessions, not raw page loads. */
  totalVisits: number;
  bestSellingProducts: BestSellingProduct[] | null;
  topCustomers: TopCustomer[] | null;
}

export interface GrowthData {
  totalRevenue: number;
  isInactive: boolean;
}

export interface GrowthTrendData {
  today: GrowthData;
  yesterday: GrowthData;
  currentWeek: GrowthData;
  lastWeek: GrowthData;
  currentMonth: GrowthData;
  lastMonth: GrowthData;
  currentYear: GrowthData;
  lastYear: GrowthData;
}

export interface StorePerformanceReportData {
  sales: SalesData;
  growthTrend: GrowthTrendData;
}

export interface StorePerformanceReportResponse {
  message: string;
  code: string;
  data: StorePerformanceReportData;
}

export interface Bank {
  name: string;
  code: string;
}

export interface GetBanksResponse {
  message: string;
  code: string;
  data: Bank[];
}

export interface ValidateAccountPayload {
  bankCode: string;
  accountNumber: string;
}

export interface ValidateAccountData {
  accountNumber: string;
  accountName: string;
}

export interface ValidateAccountResponse {
  message: string;
  code: string;
  data: ValidateAccountData;
}

export interface VendorCustomer {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  backupPhone?: string | null;
  deliveryAddress?: string | null;
  lastSeen?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface GetVendorCustomersResponse {
  code: string;
  message: string;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  data: VendorCustomer[];
}

export type NotificationType =
  | "order"
  | "stock"
  | "payout"
  | "performance"
  | "subscription"
  | string;

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  /** ISO date string from the API. */
  createdAt: string;
  /** Optional: a screen name in RootStackParamList to navigate to on tap. */
  route: string | null;
  /** Optional: JSON-encoded params for the destination screen. */
  routeParams: string | null;
  /** Either "notification" (per-user row — orders, payouts, low stock,
   *  subscription notices) or "announcement" (shared platform-wide
   *  broadcast). The id space is per-table, so we pass kind back to
   *  mark-as-read to disambiguate. Defaults to "notification" for
   *  backwards-compatibility with older payloads. */
  kind?: "notification" | "announcement";
}

export interface GetNotificationsResponse {
  message: string;
  code: string;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  data: AppNotification[];
}

export interface UnreadCountResponse {
  message: string;
  code: string;
  data: number;
}

/** Mirrors `StaffStatus` enum on the backend (1-indexed). */
export type StaffStatus = 'Pending' | 'Active' | 'Suspended' | 'Removed';

export interface StaffMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  permissions: string[];
  status: StaffStatus;
  invitedAt: string;
  acceptedAt: string | null;
  /** Plaintext password — only set on the response from `invite`
   *  and `resend-invite` so the vendor can copy/share it. Never
   *  populated by the `list` endpoint. */
  issuedPassword?: string | null;
}

export interface StaffListResult {
  staff: StaffMember[];
  /** Plan-derived seat budget. Null means unlimited. */
  seatLimit: number | null;
  seatsUsed: number;
}

export interface InviteStaffPayload {
  fullName: string;
  email: string;
  permissions: string[];
  /** Optional. When omitted the server generates a random password
   *  and returns it as `issuedPassword` so the vendor can copy
   *  + share it even if the credentials email never arrives. */
  password?: string;
}

export interface UpdateStaffPermissionsPayload {
  staffId: string;
  permissions: string[];
}

export interface OrderActivity {
  id: string;
  batchId: string;
  /** Stable string keys: payment_confirmed | payment_rejected | status_changed.
   *  Free-form strings on the wire so adding a new action doesn't break
   *  older clients. */
  action: string;
  /** JSON-encoded extra context, action-specific. */
  metadata: string | null;
  /** Cached display name of the actor at the time of the action.
   *  Empty / null when the action was system-driven. */
  actorName: string | null;
  createdAt: string;
}
