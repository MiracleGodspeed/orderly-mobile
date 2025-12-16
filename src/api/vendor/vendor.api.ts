import { apiClient } from "../client";
import {
  GetCategoriesResponse,
  VendorOnboardingRequest,
  VendorOnboardingResponse,
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
