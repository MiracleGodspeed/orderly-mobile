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
  stock: number;
  sales: number | null;
  reviews: number;
  profit: number | null;
  margin: number | null;
  revenue: number | null;
  rating: number;
  status: number;
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
  status: 'success' | 'pending' | 'failed' | 'pending_vendor_manual_confirmation';
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

export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  /** Public-storefront visits in the selected period. Deduped on write
   *  (30-min window per IP+store) so this represents distinct visitor
   *  sessions, not raw page loads. */
  totalVisits: number;
  bestSellingProducts: BestSellingProduct[] | null;
  topCustomers: any | null;
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
