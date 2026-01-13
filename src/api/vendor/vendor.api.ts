import { apiClient } from "../client";
import {
  GetCategoriesResponse,
  VendorOnboardingRequest,
  VendorOnboardingResponse,
  GetStorefrontDetailsResponse,
  GetProductsResponse,
  CreateProductPayload,
  UpdateProductPayload,
  PaginatedOrdersResponse,
  SubscriptionHistoryResponse, SubscriptionHistoryParams, SubscriptionHistory,
  GetPlansResponse, ApiSubscriptionPlan,
} from "./vendor.types";

type GetOrdersParams = {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  datefrom?: string;
  dateto?: string;
};




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
  //     response.data.message || "Failed to fetch storefront details"
  //   );
  // }

  return response.data.data;
};

export const getProducts = async (): Promise<GetProductsResponse> => {
  const response = await apiClient.get<GetProductsResponse>(
    "/catalog/get-catalog-items-by-store-id",
    {
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

export const createProduct = async (
  payload: CreateProductPayload
) => {
  const formData = new FormData();

  formData.append("Title", payload.title);
  formData.append("Category", payload.category);
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
  formData.append("Category", payload.category);
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
  const res = await apiClient.get<PaginatedOrdersResponse>(
    '/order-requests/get-paid-catalog-items',
    { params }
  );

  return res.data;
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