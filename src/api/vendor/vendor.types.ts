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

export interface UpdateStorefrontSettingsResponse {
  message: string;
  code: string;
  data: boolean;
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


export type CatalogItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: 'success' | 'pending' | 'failed';
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
};

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


export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  bestSellingProducts: any | null;
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
