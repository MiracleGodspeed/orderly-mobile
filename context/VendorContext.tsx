import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { getStorefrontDetails } from "../src/api/vendor/vendor.api";

interface VendorContextType {
  businessName: string;
  description: string;
  isServiceBased: boolean | null;
  selectedCategories: number[];
  storeData: StoreData | null;
  setBusinessInfo: (name: string, description: string) => void;
  setServiceType: (isService: boolean) => void;
  toggleCategory: (categoryId: number) => void;
  resetVendorData: () => void;
  fetchVendorData: () => Promise<void>;
}
export interface StoreData {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string | null;
  accountName?: string | null;
  accountNumber?: string;
  discountOnAllProducts?: string;
  bank: string;
  feeBearer: 'vendor' | 'customer' | 'included';
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  storeFrontJson: StoreFrontJson;
  vendor_locations: VendorLocation[];
  vendor_delivery_charges?: VendorDelivery[] | null;
  vendor_custom_locations?: VendorCustomLocations[] | null;
  newestCatalogItems?: Product[] | null;
  vendorOnboardProgressResponse: VendorOnboardProgress;
  storeSubscription: StoreSubscription;
  slugUrl: string | null;
  isVerified: boolean;
  isEmailVerified: boolean;
  workingDaysHours?: WorkingHours[];
  transferDirectlyToVendor: boolean;
  isServiceBased: boolean;
  templateId: string;
  isPublished: boolean;
  promoBanner: string
  savedPaymentMethod: PaymentMethod
}
export interface PaymentMethod {
  last4: string;
  expMonth?: string;
  expYear?: string;
  accountName?: string;
}
interface VendorOnboardProgress {
  addedFirstProduct: boolean,
  managedStoreFront: boolean,
  updatedPersonsalProfile: boolean,
}
interface StoreSubscription {
  daysRemaining: number;
  gracePeriodInDays: number;
  isTrial: boolean
}
export interface Product {
  id: string;
  // name: string;
  title?: string | null;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  status: number;
  image: string;
  sku: string;
  description: string;
  sales: number;
  revenue: number;
  rating: number;
  reviews: number;
  profit: number;
  margin: number;
  lastSold: string;
  trending: boolean;
  badge?: 'New Flagship' | 'Flash Sale' | 'New Arrival' | null;
  features: string[];
  createdAt?: string | null;
}
export interface HeroItem {
  title: string;
  subTitle: string;
  slideImage: string | null;
}
export interface StoreFrontJson {
  heroArr: HeroItem[];
  aboutTitle: string;
  aboutBody: string;
  contactSection: string;
  faq: string | null;
}

export interface WorkingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string | null;
  extraInfo?: string | null;
  features?: string | null;
  requestLimitPerMonth?: number | null;
  yearlyPecentageDiscount?: number | null; // default 15
  quarterlyPecentageDiscount?: number | null;
  catalogItemLimit?: number | null;
  price: number;
  isPopular: boolean;
  badge?: string | null;
  buttonText?: string | null;
  buttonStyle?: string | null;
}


export interface VendorSubscription {
  subscriptionPlanId: number;
  subscriptionPlan: SubscriptionPlan;
  startDate?: string | null; // ISO date string
  expiryDate?: string | null;
  subscriptionDuration?: number | null;
  durationUnit?: string | null; // "months", "weeks", "days", "hours"
  status: string; // "pending", "success", "failed"
  usedRequestCount?: number | null;
  hasCustomDomain: boolean;
  isTrialPeriod: boolean;
  daysRemaining: number;
  gracePeriodInDays: number;
  isActive: boolean;
  amountPaid?: number | null;
  paymentReference?: string | null;
  paymentGateway?: string | null; // e.g., "Paystack"
  paidAt?: string | null;
  createdAt?: string | null;
  planFeatures?: string[] | null;
}

export interface VendorLocation {
  localGovernmentIds: string[];
  stateId: string
}
export interface VendorCustomLocations {
  name: string;
  deliveryCharge: string,
  id: string,
  stateId: string,
}

export interface DashboardDataResponse {
  sales: SalesData;
  // growthTrend: GrowthTrend;
}

export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  // bestSellingProducts: BestSellingProduct[];
}

interface VendorData {
  token: string;
  userId: string;
  fullName: string;
  storeName: string | null;
  storeId: string;
  phoneNumber: string | null;
  email: string;
  role: number;
  userStatus: number;
}
export interface VendorDelivery {
  localGovernmentId: string;
  charge: number
}
const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const VendorProvider = ({ children }: { children: ReactNode }) => {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [isServiceBased, setIsServiceBased] = useState<boolean | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [storeData, setStoreData] = useState<StoreData>({} as StoreData);


  const fetchVendorData = async () => {
    try {
      const response = await getStorefrontDetails();
      console.log(response, "storeData")
      setStoreData(response)
      if (response) {
        setBusinessName(response.storeName || "");
        setIsServiceBased(response.isServiceBased);
      }
    } catch (error) {
      console.error("Error fetching vendor data:", error);
    }
  };

  useEffect(() => {
    fetchVendorData()
  }, [])
  const setBusinessInfo = (name: string, desc: string) => {
    setBusinessName(name);
    setDescription(desc);
  };

  const setServiceType = (isService: boolean) => {
    setIsServiceBased(isService);
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const resetVendorData = () => {
    setBusinessName("");
    setDescription("");
    setIsServiceBased(null);
    setSelectedCategories([]);
  };

  return (
    <VendorContext.Provider
      value={{
        businessName,
        description,
        isServiceBased,
        selectedCategories,
        setBusinessInfo,
        setServiceType,
        toggleCategory,
        resetVendorData,
        storeData,
        fetchVendorData
      }}
    >
      {children}
    </VendorContext.Provider>
  );
};

export const useVendor = () => {
  const ctx = useContext(VendorContext);
  if (!ctx) {
    throw new Error("useVendor must be used within VendorProvider");
  }
  return ctx;
};
