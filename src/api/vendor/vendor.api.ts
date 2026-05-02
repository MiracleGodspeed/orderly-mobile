import { apiClient } from "../client";
import {
  GetCategoriesResponse,
  VendorOnboardingRequest,
  VendorOnboardingResponse,
  GetStorefrontDetailsResponse,
  UpdateStorefrontSettingsResponse,
  GetProductsResponse,
  CreateProductPayload,
  UpdateProductPayload,
  PaginatedOrdersResponse, GetOrdersParams,
  SubscriptionHistoryResponse, SubscriptionHistoryParams, SubscriptionHistory,
  GetPlansResponse, ApiSubscriptionPlan,
  StorePerformanceReportResponse, StorePerformanceReportData,
  Bank, GetBanksResponse, ValidateAccountData,
  AppNotification, GetNotificationsResponse, UnreadCountResponse,
  VendorCustomer, GetVendorCustomersResponse,
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

export const getStorefrontDetails = async () => {
  const response = await apiClient.get<GetStorefrontDetailsResponse>(
    "/storefront/get-storefront-details-by-store-id",
    {
      validateStatus: () => true,
    }
  );

  // if (response.data.code !== "200") {
  //   console.log(response, "code")
  //   throw new Error(
  //   );
  // }

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
 * Set who absorbs the transaction fee — `customer` (added at checkout),
 * `vendor` (deducted from settlement), or `included` (already baked into
 * the listed price).
 */
export const setTransactionChargeBearer = async (
  bearer: "vendor" | "customer" | "included"
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
  durationValue?: number,
  datefrom?: string,
  dateto?: string
): Promise<StorePerformanceReportData> => {
  const response = await apiClient.get<StorePerformanceReportResponse>(
    `/reporting/store-performance-report`,
    {
      params: {
        durationValue,
        datefrom,
        dateto
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
  planName: string | null;
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
}

const normalizeNotification = (n: RawNotification): AppNotification => ({
  id: n.id,
  type: (n.type as AppNotification["type"]) || "order",
  title: n.title,
  message: n.message,
  // Backend may serialize as IsRead (PascalCase) or isRead — accept both.
  isRead: (n.isRead ?? n.IsRead) === true,
  createdAt: n.createdAt,
  route: n.route ?? null,
  routeParams: n.routeParams ?? null,
});

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

export const markNotificationAsRead = async (id: string): Promise<void> => {
  const response = await apiClient.post<{ code: string; message: string }>(
    "/notifications/mark-as-read",
    null,
    { params: { id }, validateStatus: () => true }
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