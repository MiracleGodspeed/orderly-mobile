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

export interface StorefrontDetailsData {
  storeId: string;
  storeName: string;
  slugUrl: string;
  isPublished: boolean;

  vendorOnboardProgressResponse: {
    addedFirstProduct: boolean;
    managedStoreFront: boolean;
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

