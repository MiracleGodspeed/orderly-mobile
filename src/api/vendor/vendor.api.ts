import { apiClient } from "../client";
import type { WholesaleRule } from "../../lib/wholesale";
import {
  GetCategoriesResponse,
  VendorOnboardingRequest,
  VendorOnboardingResponse,
  StoreUrlSuggestion,
  StoreUrlSuggestionsResponse,
  NewsletterOverview,
  NewsletterOverviewResponse,
  NewsletterSubscriber,
  GetNewsletterSubscribersResponse,
  GetStorefrontDetailsResponse,
  UpdateStorefrontSettingsResponse,
  GetProductsResponse,
  CreateProductPayload,
  UpdateProductPayload,
  PaginatedOrdersResponse, GetOrdersParams,
  LogOfflineOrderRequest,
  SubscriptionHistoryResponse, SubscriptionHistoryParams, SubscriptionHistory,
  GetPlansResponse, ApiSubscriptionPlan,
  StorePerformanceReportResponse, StorePerformanceReportData,
  Bank, GetBanksResponse, ValidateAccountData,
  AppNotification, GetNotificationsResponse, UnreadCountResponse,
  VendorCustomer, GetVendorCustomersResponse,
  StaffMember, StaffListResult, InviteStaffPayload, UpdateStaffPermissionsPayload,
  OrderActivity,
} from "./vendor.types";






export const getCategories = async () => {
  const response = await apiClient.get<GetCategoriesResponse>(
    "/storefront/get-categories",
    {
      validateStatus: () => true,
    }
  );

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to fetch categories");
  }

  return response.data.data;
};


export const submitVendorOnboarding = async (
  payload: VendorOnboardingRequest
): Promise<VendorOnboardingResponse> => {
  const response = await apiClient.post<VendorOnboardingResponse>(
    "/storefront/update-vendor-onboarding-details",
    payload,
    {
      validateStatus: () => true,
    }
  );

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Onboarding failed");
  }

  return response.data;
};

/**
 * Live store-URL suggestions (+ availability) for the onboarding
 * business-name field. Called debounced as the vendor types. Returns []
 * on a blank name or any error so the caller can fail soft — the submit
 * endpoint re-derives + re-checks the slug authoritatively.
 */
export const getStoreUrlSuggestions = async (
  businessName: string
): Promise<StoreUrlSuggestion[]> => {
  const response = await apiClient.get<StoreUrlSuggestionsResponse>(
    "/storefront/store-url-suggestions",
    {
      params: { businessName },
      validateStatus: () => true,
    }
  );

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to check store link");
  }

  return response.data.data ?? [];
};

// ── Newsletter ──────────────────────────────────────────────────────

/** Dashboard header: prompt on/off, plan eligibility, subscriber count. */
export const getNewsletterOverview = async (): Promise<NewsletterOverview> => {
  const response = await apiClient.get<NewsletterOverviewResponse>(
    "/newsletter/overview",
    { validateStatus: () => true }
  );
  if (response.data.code !== "200" || !response.data.data) {
    throw new Error(response.data.message || "Couldn't load newsletter settings");
  }
  return response.data.data;
};

/** Enable/disable the storefront newsletter prompt. Enabling is gated
 *  server-side on the plan granting newsletters.basic — a 403 surfaces
 *  the upgrade message via the thrown error. */
export const toggleNewsletter = async (enabled: boolean): Promise<void> => {
  const response = await apiClient.post<{ code: string; message: string }>(
    "/newsletter/toggle",
    { enabled },
    { validateStatus: () => true }
  );
  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Couldn't update the newsletter setting");
  }
};

/** Paginated subscriber list for the dashboard. */
export const getNewsletterSubscribers = async (params?: {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
}): Promise<{
  data: NewsletterSubscriber[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}> => {
  const response = await apiClient.get<GetNewsletterSubscribersResponse>(
    "/newsletter/subscribers",
    {
      params: {
        pageIndex: params?.pageIndex ?? 1,
        pageSize: params?.pageSize ?? 20,
        search: params?.search?.trim() || undefined,
      },
      validateStatus: () => true,
    }
  );
  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Couldn't load subscribers");
  }
  return {
    data: response.data.data ?? [],
    pageIndex: response.data.pageIndex ?? 1,
    pageSize: response.data.pageSize ?? 20,
    totalCount: response.data.totalCount ?? 0,
    totalPages: response.data.totalPages ?? 0,
  };
};

export const getStorefrontDetails = async () => {
  const response = await apiClient.get<GetStorefrontDetailsResponse>(
    "/storefront/get-storefront-details-by-store-id",
    {
      validateStatus: () => true,
    }
  );

  // Throw on a non-success envelope instead of silently returning
  // `undefined`. Swallowing the error here is what let the onboarding
  // flow believe a failed/empty fetch "succeeded": the dashboard then
  // rendered "My Store"/"yourstore" placeholders against null data with
  // no signal that anything went wrong. Callers (VendorContext) catch
  // this and can surface it / block navigation.
  if (response.data.code !== "200") {
    throw new Error(
      response.data.message || "Failed to load your store details"
    );
  }

  return response.data.data;
};

export const updateStorefrontSettings = async (payload: any): Promise<UpdateStorefrontSettingsResponse> => {
  const response = await apiClient.post<UpdateStorefrontSettingsResponse>(
    "/storefront/update-store-front-settings",
    payload,
    {
      validateStatus: () => true,
    }
  );

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to update storefront settings");
  }

  return response.data;
};

/**
 * Bank/payout details have their own dedicated endpoint on the backend
 * (separate from the general storefront-settings update). The web client
 * uses this same endpoint via Endpoint.updateBankAccountInfo. Going through
 * /update-store-front-settings doesn't persist these fields.
 */
export const updateBankAccountInfo = async (payload: {
  bank: string;
  accountNumber: string;
  accountName: string;
}): Promise<{ message: string; code: string }> => {
  const response = await apiClient.post<{ message: string; code: string }>(
    "/storefront/update-vendor-profile-details",
    payload,
    { validateStatus: () => true }
  );

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to update bank details");
  }

  return response.data;
};

// ----- Vendor-defined catalog categories -------------------------------------

export const getCatalogCategories = async (): Promise<
  import("./vendor.types").CatalogCategory[]
> => {
  const response = await apiClient.get<
    import("./vendor.types").GetCatalogCategoriesResponse
  >(
    "/catalog/get-catalog-categories-by-id",
    { validateStatus: () => true }
  );
  if (response.data.code !== "200") {
    throw new Error(
      response.data.message || "Failed to fetch catalog categories"
    );
  }
  return response.data.data ?? [];
};

export const createCatalogCategory = async (payload: {
  name: string;
  description?: string;
}): Promise<{ message: string; code: string }> => {
  const response = await apiClient.post<{ message: string; code: string }>(
    "/catalog/create-catalog-category",
    payload,
    { validateStatus: () => true }
  );
  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to create category");
  }
  return response.data;
};

/**
 * Backend route is `/catalog/modify-category` — historically the web's helper
 * is named `deleteCategory` even though it's actually a rename. We name it
 * accurately here.
 */
export const renameCatalogCategory = async (
  id: number,
  name: string
): Promise<{ message: string; code: string }> => {
  const response = await apiClient.post<{ message: string; code: string }>(
    `/catalog/modify-category?id=${encodeURIComponent(
      String(id)
    )}&name=${encodeURIComponent(name)}`,
    null,
    { validateStatus: () => true }
  );
  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to rename category");
  }
  return response.data;
};

export const deleteCatalogCategory = async (
  id: number
): Promise<{ message: string; code: string }> => {
  const response = await apiClient.post<{ message: string; code: string }>(
    `/catalog/delete-category?id=${encodeURIComponent(String(id))}`,
    null,
    { validateStatus: () => true }
  );
  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to delete category");
  }
  return response.data;
};

/**
 * Result of a successful generation — pairs the generated copy with
 * the rate-limit headers so the caller can render the remaining-today
 * counter alongside the description without a second round-trip.
 */
export interface GenerateProductDescriptionResult {
  description: string;
  /** Credits left on this UTC day AFTER this generation, or `null`
   *  if the server didn't send the header (older backend version). */
  remainingToday: number | null;
  /** Plan's total daily allowance, echoed back for UI labels. */
  dailyLimit: number | null;
  /** UTC instant the quota resets (unix seconds in the header). */
  resetAtUtc: Date | null;
}

/**
 * Thrown when the backend rejects the generation with a 429 (rate
 * limit exhausted for today) or 403 (plan doesn't include the
 * feature). Carries the same rate-limit metadata as the success path
 * so the UI can show "X used / Y total, resets at HH:MM" copy.
 */
export class AiDescriptionLimitError extends Error {
  constructor(
    message: string,
    public readonly kind: "rate_limited" | "feature_locked",
    public readonly remainingToday: number | null,
    public readonly dailyLimit: number | null,
    public readonly resetAtUtc: Date | null,
  ) {
    super(message);
    this.name = "AiDescriptionLimitError";
  }
}

function parseRateLimitHeaders(headers: Record<string, unknown> | undefined): {
  remainingToday: number | null;
  dailyLimit: number | null;
  resetAtUtc: Date | null;
} {
  const headerVal = (key: string) => {
    const raw = headers?.[key] ?? headers?.[key.toLowerCase()];
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
    return null;
  };
  const remainingRaw = headerVal("x-ratelimit-remaining");
  const limitRaw = headerVal("x-ratelimit-limit");
  const resetRaw = headerVal("x-ratelimit-reset");
  const remaining = remainingRaw != null ? Number(remainingRaw) : null;
  const dailyLimit = limitRaw != null ? Number(limitRaw) : null;
  const resetUnix = resetRaw != null ? Number(resetRaw) : null;
  return {
    remainingToday: Number.isFinite(remaining) ? (remaining as number) : null,
    dailyLimit: Number.isFinite(dailyLimit) ? (dailyLimit as number) : null,
    resetAtUtc: Number.isFinite(resetUnix)
      ? new Date((resetUnix as number) * 1000)
      : null,
  };
}

/**
 * Read-only credits snapshot for Orderly AI. Hit on AddProductModal
 * open so vendors see "X left today" before they tap Generate.
 * Returns null on any failure — UI falls back to "no chip" instead
 * of crashing.
 */
export interface AiDescriptionCreditsSnapshot {
  remainingToday: number;
  dailyLimit: number;
  resetAtUtc: string;
  hasFeature: boolean;
}

export const getAiDescriptionCredits = async (): Promise<AiDescriptionCreditsSnapshot | null> => {
  try {
    const response = await apiClient.get<{
      code: string;
      message: string;
      data: AiDescriptionCreditsSnapshot | null;
    }>("/catalog/ai/credits", { validateStatus: () => true });
    if (response.data?.code !== "200" || !response.data?.data) return null;
    return response.data.data;
  } catch {
    return null;
  }
};

export const generateProductDescription = async (
  productName: string,
  category?: string
): Promise<GenerateProductDescriptionResult> => {
  const response = await apiClient.post<{
    code: string;
    message: string;
    data: string | null;
  }>(
    "/catalog/ai/generate-description",
    {
      productName,
      category: category || null,
    },
    { validateStatus: () => true }
  );

  const meta = parseRateLimitHeaders(response.headers as Record<string, unknown>);

  // Backend returns 403 when the active plan doesn't include the AI
  // feature, and 429 when today's quota is exhausted. Both come back
  // through the same standard-response envelope; we use the HTTP
  // status to choose the error kind so the UI can render the right
  // paywall vs "try again tomorrow" copy.
  if (response.status === 403) {
    throw new AiDescriptionLimitError(
      response.data?.message || "Orderly AI isn't included on your current plan.",
      "feature_locked",
      meta.remainingToday,
      meta.dailyLimit,
      meta.resetAtUtc,
    );
  }
  if (response.status === 429) {
    throw new AiDescriptionLimitError(
      response.data?.message || "You've used today's Orderly AI generations.",
      "rate_limited",
      meta.remainingToday,
      meta.dailyLimit,
      meta.resetAtUtc,
    );
  }

  if (response.data.code !== "200" || !response.data.data) {
    throw new Error(
      response.data.message || "Couldn't generate a description right now"
    );
  }
  return {
    description: response.data.data,
    remainingToday: meta.remainingToday,
    dailyLimit: meta.dailyLimit,
    resetAtUtc: meta.resetAtUtc,
  };
};

/**
 * Set / clear the store-wide discount applied to every product. Pass 0 (or
 * any value <= 0) to remove an existing discount.
 */
export const applyGlobalDiscount = async (
  discountValue: number
): Promise<{ message: string; code: string }> => {
  const response = await apiClient.post<{ message: string; code: string }>(
    `/storefront/apply-global-discount?discountValue=${encodeURIComponent(
      String(discountValue)
    )}`,
    null,
    { validateStatus: () => true }
  );
  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to update discount");
  }
  return response.data;
};

/**
 * Sets the storefront's charge-bearer / payment-mode setting.
 *
 * Three values represent the platform-fee-bearer (online payment):
 *   - `customer` — fee added on top at checkout
 *   - `vendor`   — fee deducted from settlement
 *   - `included` — already baked into the listed price
 *
 * Two values flip the entire payment mode:
 *   - `direct`   — customer transfers straight to the vendor's bank
 *                  account; backend sets `transferDirectlyToVendor=true`
 *                  and disables Paystack auto-collection.
 *   - `whatsapp` — storefront hands the customer off to the vendor's
 *                  WhatsApp with a pre-typed invoice; backend sets
 *                  `whatsappCheckoutEnabled=true` and clears the
 *                  other two modes.
 */
export const setTransactionChargeBearer = async (
  bearer: "vendor" | "customer" | "included" | "direct" | "whatsapp"
): Promise<{ message: string; code: string }> => {
  const response = await apiClient.post<{ message: string; code: string }>(
    `/storefront/set-transaction-charge-bearer?chargeBearer=${encodeURIComponent(
      bearer
    )}`,
    null,
    { validateStatus: () => true }
  );
  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to update fee setting");
  }
  return response.data;
};

/**
 * Persist the vendor's WhatsApp checkout number. Separate from the
 * fee-bearer endpoint so the number can be edited without flipping
 * the mode (and so the UI can save the number BEFORE flipping the
 * mode, avoiding a brief window where WhatsApp mode is on but no
 * number is on file).
 *
 * The .NET service strips non-digits and enforces a 10-15 digit
 * length. Pass `null` to clear.
 */
export const setWhatsappCheckoutNumber = async (
  number: string | null
): Promise<{ message: string; code: string }> => {
  const response = await apiClient.put<{ message: string; code: string }>(
    `/storefront/whatsapp-checkout-number`,
    { number },
    { validateStatus: () => true }
  );
  if (response.data.code !== "200") {
    throw new Error(
      response.data.message || "Failed to update WhatsApp number"
    );
  }
  return response.data;
};

/**
 * Replace the vendor's wholesale policies (full-list PUT — always send
 * the complete set). The server sanitizes/normalizes each rule and
 * returns the canonical list with server-assigned ids, which the caller
 * should adopt.
 */
export const saveWholesaleRules = async (
  rules: WholesaleRule[]
): Promise<WholesaleRule[]> => {
  const response = await apiClient.put<{
    message: string;
    code: string;
    data: WholesaleRule[];
  }>(`/storefront/wholesale-rules`, rules, { validateStatus: () => true });
  if (response.data.code !== "200") {
    throw new Error(
      response.data.message || "Failed to save wholesale pricing"
    );
  }
  return response.data.data ?? rules;
};

type GetProductsParams = {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  /** When set, the server returns only products with `stock < lowStockThreshold`. */
  lowStockThreshold?: number;
};

export const getProducts = async (params?: GetProductsParams): Promise<GetProductsResponse> => {
  console.log('getProducts payload:', params);
  const response = await apiClient.get<GetProductsResponse>(
    "/catalog/get-catalog-items-by-store-id",
    {
      params,
      validateStatus: () => true,
    }
  );

  if (!response.data) {
    throw new Error("No response from server");
  }

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to fetch products");
  }

  return response.data;
};

// ASP.NET Core's FromForm model binder accepts object arrays via indexed
// field names (`VariantPrices[0].Size=...`). Sending JSON instead would
// require a different binder on the API side; this keeps everything in
// one multipart upload along with the image files.
function appendVariantPrices(
  formData: FormData,
  variants: import("./vendor.types").VariantPrice[] | undefined
) {
  // Always send a sentinel so the backend can distinguish "vendor cleared
  // all overrides" from "vendor didn't touch them". Sending nothing leaves
  // it null on the server, which also means cleared — same effect, but
  // explicit `[]` is clearer in network logs.
  if (!variants || variants.length === 0) return;
  variants.forEach((v, i) => {
    formData.append(`VariantPrices[${i}].Size`, v.size ?? "");
    formData.append(`VariantPrices[${i}].Color`, v.color ?? "");
    formData.append(`VariantPrices[${i}].Price`, String(v.price ?? 0));
    if (v.stock != null) {
      formData.append(`VariantPrices[${i}].Stock`, String(v.stock));
    }
  });
}

/**
 * Uploads a local image (a file URI from expo-image-picker) to Cloudinary
 * via the backend and returns the hosted URL.
 *
 * Storefront hero / logo images MUST go through this — never embed a
 * `data:image;base64,…` string into `storeFrontJson` / `logoUrl`. Base64
 * inflates the StoreSettings row to several MB, which the API then loads on
 * every storefront read and chokes the server (GC thrash). Mirrors how
 * product images are handled (multipart → backend → Cloudinary URL).
 */
export const uploadImage = async (
  uri: string,
  folder: string = "storefront"
): Promise<string | null> => {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: "image.jpg",
    type: "image/jpeg",
  } as any);

  const response = await apiClient.post(
    `/Image/upload?folder=${encodeURIComponent(folder)}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      validateStatus: () => true,
    }
  );

  if (response.status >= 200 && response.status < 300) {
    // Backend returns OperationResult<string> — Cloudinary URL is in `.data`.
    return response.data?.data ?? null;
  }
  return null;
};

export const createProduct = async (
  payload: CreateProductPayload
) => {
  const formData = new FormData();

  formData.append("Title", payload.title);
  if (payload.catalogCategoryId != null) {
    // Backend expects the ID as a string in form-data (it's a long server-side).
    formData.append("CatalogCategoryId", String(payload.catalogCategoryId));
  }
  formData.append("Description", payload.description);
  formData.append("OriginalPrice", String(payload.originalPrice));
  formData.append("Price", String(payload.price));
  formData.append("Stock", String(payload.stock));

  if (payload.badge) {
    formData.append("Badge", payload.badge);
  }

  if (payload.sku) {
    formData.append("Sku", payload.sku);
  }

  // Arrays — backend expects repeated keys
  payload.features?.forEach((item) =>
    formData.append("Features", item)
  );

  payload.colourOptions?.forEach((item) =>
    formData.append("ColourOptions", item)
  );

  payload.sizeOptions?.forEach((item) =>
    formData.append("SizeOptions", item)
  );

  // Per-variant price overrides — ASP.NET Core's form-data model binder
  // expects indexed fields (`VariantPrices[i].Field`) for object arrays.
  appendVariantPrices(formData, payload.variantPrices);

  // Images
  if (payload.imageFile1) {
    formData.append("ImageFile1", {
      uri: payload.imageFile1.uri,
      name: "image1.jpg",
      type: "image/jpeg",
    } as any);
  }

  if (payload.imageFile2) {
    formData.append("ImageFile2", {
      uri: payload.imageFile2.uri,
      name: "image2.jpg",
      type: "image/jpeg",
    } as any);
  }

  const response = await apiClient.post(
    "/catalog/create-catalog-item",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      validateStatus: () => true,
    }
  );

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Failed to create product");
  }

  return response.data;
};

export const updateProduct = async (
  productId: string,
  payload: CreateProductPayload
): Promise<any> => {
  const formData = new FormData();

  formData.append("Title", payload.title);
  if (payload.catalogCategoryId != null) {
    formData.append("CatalogCategoryId", String(payload.catalogCategoryId));
  }
  formData.append("Description", payload.description);
  formData.append("OriginalPrice", String(payload.originalPrice));
  formData.append("Price", String(payload.price));
  formData.append("Stock", String(payload.stock));

  if (payload.badge) {
    formData.append("Badge", payload.badge);
  }

  if (payload.sku) {
    formData.append("Sku", payload.sku);
  }

  payload.features?.forEach((item) =>
    formData.append("Features", item)
  );

  payload.colourOptions?.forEach((item) =>
    formData.append("ColourOptions", item)
  );

  payload.sizeOptions?.forEach((item) =>
    formData.append("SizeOptions", item)
  );

  appendVariantPrices(formData, payload.variantPrices);

  if (payload.imageFile1) {
    formData.append("ImageFile1", {
      uri: payload.imageFile1.uri,
      name: "image1.jpg",
      type: "image/jpeg",
    } as any);
  }

  if (payload.imageFile2) {
    formData.append("ImageFile2", {
      uri: payload.imageFile2.uri,
      name: "image2.jpg",
      type: "image/jpeg",
    } as any);
  }

  const response = await apiClient.post(
    `/catalog/update-catalog-item?catalogItemId=${productId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Failed to update product");
  }

  return response.data;
};

export const deleteProduct = async (productId: string): Promise<any> => {
  const response = await apiClient.post(
    `/catalog/delete-item?CatalogItemId=${productId}`,

  );

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Failed to delete product");
  }

  return response.data;
};

export const getPaidOrders = async (
  params?: GetOrdersParams
): Promise<PaginatedOrdersResponse> => {
  console.log('getPaidOrders payload:', params);
  const res = await apiClient.get<PaginatedOrdersResponse>(
    '/order-requests/get-paid-catalog-items',
    {
      params,
      validateStatus: () => true
    }
  );

  console.log('getPaidOrders response:', {
    count: res.data.data?.length,
    totalCount: res.data.totalCount,
    totalPages: res.data.totalPages,
    pageIndex: res.data.pageIndex
  });

  return res.data;
};

// Manual bank-transfer orders sit in `pending_vendor_manual_confirmation`
// until the vendor confirms. Keeping them off the Orders list would mean
// the vendor never sees the orders that need their attention — so we
// merge this bucket into useOrders alongside the paid list.
export const getUnpaidOrders = async (
  params?: GetOrdersParams
): Promise<PaginatedOrdersResponse> => {
  const res = await apiClient.get<PaginatedOrdersResponse>(
    '/order-requests/get-unpaid-catalog-items',
    {
      params,
      validateStatus: () => true
    }
  );
  return res.data;
};

// Updates every OrderRequest row under a BatchId to the given status —
// what the OrderDetails screen calls when the vendor flips Mark as
// Shipped, undoes a Shipped state, etc. The backend scopes the write to
// the calling vendor's storeId so this is safe even though the BatchId
// is exposed on the response.
export const updateOrderStatusByBatch = async (
  batchId: string,
  status: 'pending' | 'Confirmed' | 'Processing' | 'Dispatched' | 'Delivered' | 'Cancelled'
): Promise<void> => {
  const response = await apiClient.post<{ code: string; message: string }>(
    '/order-requests/update-status-by-batch',
    { batchId, status },
    { validateStatus: () => true }
  );
  if (response.data?.code !== '200') {
    throw new Error(response.data?.message || "Couldn't update order status.");
  }
};

export const logOfflineOrder = async (
  payload: LogOfflineOrderRequest
): Promise<{ batchId: string }> => {
  // Backend accepts PascalCase property names (System.Text.Json case-
  // insensitive default) but we send the camelCase shape for symmetry
  // with the rest of the API surface. Server treats "channel"/"items"/etc.
  // identically.
  const response = await apiClient.post<{
    code: string;
    message: string;
    data: string;
  }>(
    '/order-requests/log-offline',
    {
      CustomerName: payload.customerName,
      CustomerPhone: payload.customerPhone,
      CustomerEmail: payload.customerEmail,
      Channel: payload.channel,
      MarkAsPaid: payload.markAsPaid ?? true,
      Notes: payload.notes,
      Items: payload.items.map((item) => ({
        CatalogItemId: item.catalogItemId,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        Color: item.color,
        Size: item.size,
      })),
    },
    { validateStatus: () => true }
  );

  if (response.data?.code !== '200') {
    const detail =
      response.data?.message ||
      `HTTP ${response.status} ${response.statusText ?? ''}`.trim();
    throw new Error(detail || "Couldn't log the order.");
  }

  return { batchId: response.data.data };
};

/**
 * Edit a vendor-logged offline order. Same payload as logging one, but
 * PUTs to the batch. The backend rejects anything that isn't a manual
 * entry, so real storefront orders can never be edited here.
 */
export const editOfflineOrder = async (
  batchId: string,
  payload: LogOfflineOrderRequest
): Promise<{ batchId: string }> => {
  const response = await apiClient.put<{
    code: string;
    message: string;
    data: string;
  }>(
    `/order-requests/log-offline/${encodeURIComponent(batchId)}`,
    {
      CustomerName: payload.customerName,
      CustomerPhone: payload.customerPhone,
      CustomerEmail: payload.customerEmail,
      Channel: payload.channel,
      MarkAsPaid: payload.markAsPaid ?? true,
      Notes: payload.notes,
      Items: payload.items.map((item) => ({
        CatalogItemId: item.catalogItemId,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        Color: item.color,
        Size: item.size,
      })),
    },
    { validateStatus: () => true }
  );

  if (response.data?.code !== '200') {
    const detail =
      response.data?.message ||
      `HTTP ${response.status} ${response.statusText ?? ''}`.trim();
    throw new Error(detail || "Couldn't update the order.");
  }

  return { batchId: response.data.data || batchId };
};

/** Delete a vendor-logged offline order (manual entries only; enforced
 *  server-side). */
export const deleteOfflineOrder = async (batchId: string): Promise<void> => {
  const response = await apiClient.delete<{ code: string; message: string }>(
    `/order-requests/log-offline/${encodeURIComponent(batchId)}`,
    { validateStatus: () => true }
  );
  if (response.data?.code !== '200') {
    throw new Error(response.data?.message || "Couldn't delete the order.");
  }
};

/**
 * Fetches a prorated-upgrade quote for the vendor's current sub →
 * picked plan + cycle. Read-only — safe to call as the vendor flips
 * between plans/cycles in the picker. Drives the upgrade-preview
 * step (UpgradePreviewStep on mobile, mirrors web SubscriptionFlow
 * Modal's "upgrade" step). Throws on transport / server error so the
 * caller can render a clear failure state instead of a blank quote.
 */
export const getUpgradeQuote = async (
  payload: import("./vendor.types").GetUpgradeQuotePayload
): Promise<import("./vendor.types").SubscriptionUpgradeQuote> => {
  const response = await apiClient.post<{
    code: string;
    message: string;
    data: import("./vendor.types").SubscriptionUpgradeQuote;
  }>(
    "/vendor-subscription/upgrade-quote",
    payload,
    { validateStatus: () => true }
  );

  if (response.data?.code !== "200" || !response.data?.data) {
    throw new Error(
      response.data?.message ?? "Couldn't load your upgrade quote."
    );
  }
  return response.data.data;
};

export const createVendorSubscription = async (
  payload: import("./vendor.types").CreateVendorSubscriptionPayload
): Promise<import("./vendor.types").CreateVendorSubscriptionData> => {
  const response = await apiClient.post<import("./vendor.types").CreateVendorSubscriptionResponse>(
    "/vendor-subscription/create",
    payload,
    { validateStatus: () => true }
  );

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to start subscription");
  }
  if (!response.data.data?.authorizationUrl) {
    throw new Error("No authorization URL returned");
  }
  return response.data.data;
};

export const verifyPayment = async (
  reference: string
): Promise<import("./vendor.types").VerifyPaymentData> => {
  const response = await apiClient.get<any>(
    `/payment/verify/${encodeURIComponent(reference)}`,
    { validateStatus: () => true }
  );

  // The verify endpoint may return either the standard envelope OR Paystack's
  // raw shape. Treat anything where the inner data.status === "success" as
  // confirmed; otherwise surface the message.
  const body = response.data;
  const inner = body?.data ?? body;
  const status = inner?.status ?? body?.status;

  if (response.status >= 200 && response.status < 300 && status === "success") {
    return {
      status: "success",
      reference: inner?.reference ?? reference,
      amount: inner?.amount,
    };
  }

  return {
    status: status || "failed",
    reference,
  };
};

/**
 * Sends the Apple StoreKit receipt to the backend for verification.
 * The backend calls Apple's `verifyReceipt` endpoint server-side,
 * extracts the canonical transaction info, and creates a
 * SubscriptionHistory row tied to the active vendor. Returns the
 * Apple transaction id so the caller can pass it to onPaymentVerified
 * (matching the Paystack `reference` shape).
 */
export const verifyAppleReceipt = async (payload: {
  /** Base64 StoreKit receipt from `purchase.transactionReceipt`. */
  receipt: string;
  /** Apple product id of the purchased subscription. */
  appleProductId: string;
  /** Internal subscription plan id this product maps to. */
  subscriptionPlanId: number;
  /** Billing cycle in months — 1, 3, or 12. */
  subscriptionDuration: number;
  /** Apple transaction id from `purchase.transactionId`. */
  transactionId: string;
  /**
   * StoreKit 2 JWS token (from `purchase.purchaseToken`). Used by
   * the backend as a fallback when Apple's legacy verifyReceipt
   * rejects the receipt blob — common with sandbox StoreKit 2.
   */
  jws?: string;
}): Promise<{ status: "success" | "failed"; reference: string }> => {
  const response = await apiClient.post<{
    code: string;
    message: string;
    data?: { reference?: string };
  }>(
    "/vendor-subscription/verify-apple-receipt",
    payload,
    {
      validateStatus: () => true,
      // The global axios config is timeout:60s + axiosRetry(3) with
      // shouldResetTimeout — which on a hung verify means up to 4×60s
      // ≈ 4 minutes of "Confirming your payment…" before the user sees
      // anything. The backend now fails fast (bounded Apple call), so
      // cap this leg tightly and allow at most one retry: worst case
      // ~80s instead of ~240s, and the transaction is still unfinished
      // (we only finishTransaction after this succeeds) so a retry is
      // safe and Apple won't double-charge.
      timeout: 40000,
      "axios-retry": { retries: 1 },
    }
  );

  if (response.data?.code !== "200") {
    throw new Error(
      response.data?.message ?? "Couldn't verify your subscription purchase."
    );
  }

  return {
    status: "success",
    reference: response.data.data?.reference ?? payload.transactionId,
  };
};

export const getSubscriptionHistory = async (params: SubscriptionHistoryParams): Promise<SubscriptionHistory[]> => {
  const response = await apiClient.get<SubscriptionHistoryResponse>(
    "/vendor-subscription/history",
    {
      params,
      validateStatus: () => true,
    }
  );

  // Consistent with your getCategories pattern
  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to fetch subscription history");
  }

  return response.data.data;
};


export const getAvailablePlans = async (): Promise<ApiSubscriptionPlan[]> => {
  const response = await apiClient.get<GetPlansResponse>(
    "/SubscriptionPlan/plans",
    {
      validateStatus: () => true,
    }
  );

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to fetch plans");
  }

  return response.data.data;
};

export const getStorePerformanceReport = async (
  datefrom?: string,
  dateto?: string
): Promise<StorePerformanceReportData> => {
  // We always send a precise from/to window now — the server's
  // durationValue path was a rolling N-day window that drifted with
  // the time of day, which made "Today" / "Last week" inaccurate.
  const response = await apiClient.get<StorePerformanceReportResponse>(
    `/reporting/store-performance-report`,
    {
      params: {
        datefrom,
        dateto,
      },
      validateStatus: () => true,
    }
  );

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "Failed to fetch performance report");
  }
  return response.data.data;
};

export const getBanks = async (): Promise<Bank[]> => {
  try {
    const response = await apiClient.get<GetBanksResponse>(
      "/payment/get-banks",
      {
        validateStatus: () => true,
      }
    );

    console.log('getBanks response:', response.data);

    if (response?.data?.code === "200") {
      return response.data.data;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (response?.status === 404) {
      const retryResponse = await apiClient.get<GetBanksResponse>(
        "/payment/banks",
        {
          validateStatus: () => true,
        }
      );
      if (retryResponse?.data?.code === "200") return retryResponse.data.data;
      if (Array.isArray(retryResponse?.data)) return retryResponse.data;
    }

    throw new Error(response?.data?.message || `Failed to fetch banks (Code: ${response?.data?.code})`);
  } catch (error: any) {
    console.error('getBanks top level error:', error);
    throw error;
  }
};

export const validateAccount = async (
  bankCode: string,
  accountNumber: string
): Promise<ValidateAccountData> => {
  const response = await apiClient.post<any>(
    `/payment/validate-account-number?accountNumber=${accountNumber}&bankCode=${bankCode}`,
    null,
    { validateStatus: () => true }
  );

  // This endpoint returns `{ status: boolean, message, data }` — not the
  // `{ code: "200", ... }` envelope used elsewhere. Treat either shape as success.
  const body = response.data;
  const ok =
    response.status >= 200 && response.status < 300 &&
    (body?.status === true || body?.code === "200");

  if (!ok || !body?.data?.accountName) {
    throw new Error(body?.message || "Failed to validate account");
  }

  return body.data as ValidateAccountData;
};

// ─── Custom domains ──────────────────────────────────────────────────────────

export interface DomainAvailability {
  domainName: string;
  tld: string;
  available: boolean;
  priceNgn: number | null;
  unavailableReason: string | null;
}

export interface DomainSearchResult {
  query: string;
  results: DomainAvailability[];
}

export interface InitiateDomainPurchaseRequest {
  domainName: string;
  tld: string;
  years?: number;
  callbackUrl?: string;
}

export interface InitiateDomainPurchaseResult {
  orderId: number;
  domainName: string;
  priceNgn: number;
  paymentReference: string;
  authorizationUrl: string;
}

export interface MyDomain {
  id: number;
  domainName: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
}

export const searchDomains = async (
  name: string,
  tlds?: string[]
): Promise<DomainSearchResult> => {
  const params: Record<string, string> = { name };
  if (tlds && tlds.length > 0) params.tlds = tlds.join(",");
  const response = await apiClient.get<{
    code: string;
    message: string;
    data: DomainSearchResult;
  }>("/domain/search", { params, validateStatus: () => true });

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Domain search failed");
  }
  return response.data.data;
};

export const initiateDomainPurchase = async (
  payload: InitiateDomainPurchaseRequest
): Promise<InitiateDomainPurchaseResult> => {
  const response = await apiClient.post<{
    code: string;
    message: string;
    data: InitiateDomainPurchaseResult;
  }>("/domain/purchase", payload, { validateStatus: () => true });

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Could not start domain purchase");
  }
  return response.data.data;
};

export const getMyDomains = async (): Promise<MyDomain[]> => {
  const response = await apiClient.get<{
    code: string;
    message: string;
    data: MyDomain[];
  }>("/domain/my-domains", { validateStatus: () => true });

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Could not load your domains");
  }
  return response.data.data;
};

/**
 * Returns the feature keys the current vendor's subscription grants.
 * `keys` is null when the plan grants UNLIMITED access — the client should
 * treat null as "every gate passes".
 */
export interface MyFeaturesData {
  keys: string[] | null;
  /** True ONLY on the free trial. Distinct from "unlimited" (`keys ===
   *  null`): a paid top-tier plan is also unlimited but NOT a trial, so
   *  trial-only messaging must gate on this, never on `keys === null`. */
  isTrial: boolean;
  planName: string | null;
  /** Staff seat budget on the active plan. Wire convention: 0 or null
   *  means the Staff & permissions feature is locked for this vendor;
   *  a positive integer is the seat cap. Trial vendors get a
   *  sentinel-large value so the row unlocks during trial. */
  staffLimit: number | null;
  /** Daily quota for Orderly AI product-description generations.
   *  Same wire convention as `staffLimit`: 0 or null = locked,
   *  positive integer = daily cap, `Number.MAX_SAFE_INTEGER`-ish
   *  sentinel from trials = unlimited. The remaining-for-today count
   *  is NOT here — it's surfaced separately on each generation
   *  attempt via the `X-RateLimit-Remaining` response header. */
  aiDescriptionCreditsPerDay: number | null;
}

export const getMyFeatures = async (): Promise<MyFeaturesData> => {
  const response = await apiClient.get<{
    code: string;
    message: string;
    data: MyFeaturesData;
  }>("/vendor-subscription/me/features", { validateStatus: () => true });

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Failed to load features");
  }
  return response.data.data;
};

/**
 * Subset of the server's SubscriptionUsageDto that the mobile UI cares
 * about. `catalogItemLimit == null` means the plan is unlimited.
 */
export interface MySubscriptionUsage {
  planName: string | null;
  catalogItemLimit: number | null;
  currentCatalogItemCount: number;
}

export const getMySubscriptionUsage = async (): Promise<MySubscriptionUsage> => {
  const response = await apiClient.get<{
    code: string;
    message: string;
    data: {
      planName?: string | null;
      catalogItemLimit?: number | null;
      currentCatalogItemCount?: number | null;
    };
  }>("/vendor-subscription/me/usage", { validateStatus: () => true });

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Failed to load subscription usage");
  }
  const d = response.data.data ?? {};
  return {
    planName: d.planName ?? null,
    catalogItemLimit: d.catalogItemLimit ?? null,
    currentCatalogItemCount: d.currentCatalogItemCount ?? 0,
  };
};

// =============================================================
// In-app notifications (bell screen). Distinct from push: these
// are persisted rows on the server, paginated, and survive across
// devices and reinstalls.
// =============================================================

interface RawNotification {
  id: string;
  type?: string;
  title: string;
  message: string;
  isRead?: boolean;
  IsRead?: boolean;
  createdAt: string;
  route?: string | null;
  routeParams?: string | null;
  /** "notification" (per-user) or "announcement" (broadcast). The
   *  mobile passes this back to mark-as-read so the server hits the
   *  right table. Defaults to "notification" when missing on the
   *  wire — older API builds didn't include it. */
  kind?: string;
  Kind?: string;
}

const normalizeNotification = (n: RawNotification): AppNotification => {
  const rawKind = (n.kind ?? n.Kind ?? "notification").toLowerCase();
  const kind: AppNotification["kind"] =
    rawKind === "announcement" ? "announcement" : "notification";
  return {
    id: n.id,
    type: (n.type as AppNotification["type"]) || "order",
    title: n.title,
    message: n.message,
    // Backend may serialize as IsRead (PascalCase) or isRead — accept both.
    isRead: (n.isRead ?? n.IsRead) === true,
    createdAt: n.createdAt,
    route: n.route ?? null,
    routeParams: n.routeParams ?? null,
    kind,
  };
};

export const getNotifications = async (params?: {
  pageIndex?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}): Promise<{
  data: AppNotification[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}> => {
  const response = await apiClient.get<GetNotificationsResponse>(
    "/notifications/get-all",
    {
      params: {
        pageIndex: params?.pageIndex ?? 1,
        pageSize: params?.pageSize ?? 20,
        unreadOnly: params?.unreadOnly ?? false,
      },
      validateStatus: () => true,
    }
  );

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Failed to load notifications");
  }
  return {
    data: (response.data.data ?? []).map(
      (n: any) => normalizeNotification(n as RawNotification)
    ),
    pageIndex: response.data.pageIndex ?? 1,
    pageSize: response.data.pageSize ?? 20,
    totalCount: response.data.totalCount ?? 0,
    totalPages: response.data.totalPages ?? 0,
  };
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await apiClient.get<UnreadCountResponse>(
    "/notifications/unread-count",
    { validateStatus: () => true }
  );
  if (response.data?.code !== "200") {
    return 0; // Soft-fail — bell badge isn't critical
  }
  return Number(response.data.data) || 0;
};

/**
 * Vendor confirms that a manual bank-transfer order's payment has hit
 * their bank account. Backend flips the payment status to success,
 * deducts stock, and emails / pushes the customer a confirmation.
 * Returns true on success, false when already-confirmed.
 */
export const confirmManualPayment = async (reference: string): Promise<void> => {
  const response = await apiClient.get<{ code: string; message: string }>(
    "/payment/confirm-payment",
    { params: { reference }, validateStatus: () => true }
  );
  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Couldn't confirm the payment.");
  }
};

/**
 * Vendor rejects a manual bank-transfer — payment didn't actually hit
 * their account, or the customer is messing with them. Optional reason
 * is stored on the payment for audit.
 */
export const rejectManualPayment = async (
  reference: string,
  reason?: string
): Promise<void> => {
  const response = await apiClient.post<{ code: string; message: string }>(
    "/payment/manual/reject",
    null,
    {
      params: { reference, reason: reason || undefined },
      validateStatus: () => true,
    }
  );
  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Couldn't reject the payment.");
  }
};

export const markNotificationAsRead = async (
  id: string,
  kind: "notification" | "announcement" = "notification"
): Promise<void> => {
  const response = await apiClient.post<{ code: string; message: string }>(
    "/notifications/mark-as-read",
    null,
    { params: { id, kind }, validateStatus: () => true }
  );
  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Couldn't mark as read");
  }
};

export const markAllNotificationsAsRead = async (): Promise<number> => {
  const response = await apiClient.post<{ code: string; message: string; data: number }>(
    "/notifications/mark-all-as-read",
    null,
    { validateStatus: () => true }
  );
  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Couldn't mark all as read");
  }
  return Number(response.data.data) || 0;
};

// =============================================================
// Personal profile — the vendor's own name + phone, distinct from
// the store's contact details. Email isn't editable here (would
// require re-verification flow).
// =============================================================

export const updatePersonalProfile = async (payload: {
  fullName?: string;
  phoneNumber?: string;
}): Promise<void> => {
  const response = await apiClient.post<{ code: string; message: string }>(
    "/storefront/update-personal-profile",
    {
      FullName: payload.fullName,
      PhoneNumber: payload.phoneNumber,
    },
    { validateStatus: () => true }
  );

  if (response.data?.code !== "200") {
    // Verbose logging so the dev console shows the actual HTTP status,
    // response body, and headers — way easier to diagnose 401/404/500
    // than a generic toast.
    console.warn("[updatePersonalProfile] non-200 response", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });
    const detail =
      response.data?.message ||
      (typeof response.data === "string" ? response.data : null) ||
      `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
    throw new Error(`Couldn't update profile — ${detail}`);
  }
};

// =============================================================
// Vendor customers — every shopper that ever placed an order on
// the vendor's storefront. Paginated + searchable.
// =============================================================

export const getVendorCustomers = async (params?: {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
}): Promise<{
  data: VendorCustomer[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}> => {
  const response = await apiClient.get<GetVendorCustomersResponse>(
    "/storefront/get-customers-by-store-id",
    {
      params: {
        pageIndex: params?.pageIndex ?? 1,
        pageSize: params?.pageSize ?? 20,
        search: params?.search?.trim() || undefined,
      },
      validateStatus: () => true,
    }
  );

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Couldn't load customers");
  }

  // Server returns the entity verbatim (PascalCase via JSON serializer
  // settings, but most envs return camelCase). Pass through.
  return {
    data: (response.data.data ?? []).map((c: any) => ({
      id: String(c.id),
      name: c.name ?? "",
      email: c.email ?? "",
      phoneNumber: c.phoneNumber ?? "",
      backupPhone: c.backupPhone ?? null,
      deliveryAddress: c.deliveryAddress ?? null,
      lastSeen: c.lastSeen ?? null,
      note: c.note ?? null,
      createdAt: c.createdAt ?? "",
    })),
    pageIndex: response.data.pageIndex ?? 1,
    pageSize: response.data.pageSize ?? 20,
    totalCount: response.data.totalCount ?? 0,
    totalPages: response.data.totalPages ?? 0,
  };
};

// --- Staff & Permissions ---

export const listStaff = async (): Promise<StaffListResult> => {
  const res = await apiClient.get<{ code: string; message: string; data: StaffListResult }>(
    '/staff/list',
    { validateStatus: () => true }
  );
  if (res.data?.code !== '200') {
    throw new Error(res.data?.message || "Couldn't load staff list.");
  }
  return res.data.data;
};

export const inviteStaff = async (payload: InviteStaffPayload): Promise<StaffMember> => {
  const res = await apiClient.post<{ code: string; message: string; data: StaffMember }>(
    '/staff/invite',
    payload,
    { validateStatus: () => true }
  );
  if (res.data?.code !== '200') {
    throw new Error(res.data?.message || "Couldn't send invite.");
  }
  return res.data.data;
};

export const updateStaffPermissions = async (
  payload: UpdateStaffPermissionsPayload
): Promise<void> => {
  const res = await apiClient.post<{ code: string; message: string }>(
    '/staff/update-permissions',
    payload,
    { validateStatus: () => true }
  );
  if (res.data?.code !== '200') {
    throw new Error(res.data?.message || "Couldn't update permissions.");
  }
};

export const suspendStaff = async (staffId: string): Promise<void> => {
  const res = await apiClient.post<{ code: string; message: string }>(
    '/staff/suspend',
    null,
    { params: { staffId }, validateStatus: () => true }
  );
  if (res.data?.code !== '200') {
    throw new Error(res.data?.message || "Couldn't suspend staff.");
  }
};

export const reactivateStaff = async (staffId: string): Promise<void> => {
  const res = await apiClient.post<{ code: string; message: string }>(
    '/staff/reactivate',
    null,
    { params: { staffId }, validateStatus: () => true }
  );
  if (res.data?.code !== '200') {
    throw new Error(res.data?.message || "Couldn't reactivate staff.");
  }
};

export const removeStaff = async (staffId: string): Promise<void> => {
  const res = await apiClient.post<{ code: string; message: string }>(
    '/staff/remove',
    null,
    { params: { staffId }, validateStatus: () => true }
  );
  if (res.data?.code !== '200') {
    throw new Error(res.data?.message || "Couldn't remove staff.");
  }
};

/**
 * Re-fires the invite email for a Pending staff member. Backend
 * mints a fresh token + extends the 7-day TTL so an expired link is
 * also recoverable through this single call — vendor doesn't need
 * to delete + re-invite. No-op for Active / Suspended / Removed
 * staff (returns 400 with a clear message).
 */
export const resendStaffInvite = async (staffId: string): Promise<StaffMember> => {
  const res = await apiClient.post<{ code: string; message: string; data: StaffMember }>(
    '/staff/resend-invite',
    null,
    { params: { staffId }, validateStatus: () => true }
  );
  if (res.data?.code !== '200') {
    throw new Error(res.data?.message || "Couldn't resend invite.");
  }
  return res.data.data;
};

// Returns the audit timeline for a single order (BatchId). Newest first.
// The OrderDetails screen pings this whenever it opens to show "Confirmed
// by Tunde · 12 mins ago" alongside the action buttons.
export const listOrderActivity = async (batchId: string): Promise<OrderActivity[]> => {
  const res = await apiClient.get<{ code: string; message: string; data: OrderActivity[] }>(
    '/order-requests/activity',
    { params: { batchId }, validateStatus: () => true }
  );
  if (res.data?.code !== '200') {
    return [];
  }
  return res.data.data ?? [];
};