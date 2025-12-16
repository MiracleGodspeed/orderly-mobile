// Category returned from GET categories
export interface Category {
  id: number;
  name: string;
}

// Final onboarding request payload
export interface VendorOnboardingRequest {
  storeId: string;
  businessName: string;
  description: string;
  applicableCategories: number[];
  isServiceBased: boolean;
}

// Backend standard response shape
export interface VendorOnboardingResponse {
  message: string;
  code: string;
  data: boolean | null;
}

// Categories response
export interface GetCategoriesResponse {
  message: string;
  code: string;
  data: Category[];
}
