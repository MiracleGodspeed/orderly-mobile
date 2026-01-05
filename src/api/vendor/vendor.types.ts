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

export interface Product {
  id: string;
  storeId: string;
  title: string;
  category: string;
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
  category: string;
  description: string;
  originalPrice: number;
  price: number;
  stock: number;
  badge?: string;
  features?: string[];
  sku?: string;
  colourOptions?: string[];
  sizeOptions?: string[];
  imageFile1?: any; 
  imageFile2?: any;
}

export interface UpdateProductPayload extends CreateProductPayload {
  id: string; 
}