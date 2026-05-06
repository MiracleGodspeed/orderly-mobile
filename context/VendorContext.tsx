import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from "react";
import { getStorefrontDetails, updateStorefrontSettings } from "../src/api/vendor/vendor.api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "react-native";
import { useAuth } from "./AuthContext";

const STORE_DATA_CACHE = "store_data_cache";

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
  updateVendorSettings: (updates: Partial<StoreData>) => Promise<void>;
  checklistItems: ChecklistItem[];
  loading: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  isPrimary?: boolean;
  route?: string
}

export interface StoreData {
  storeId: string;
  storeName: string;
  phone: string | null;
  email: string;
  /** Vendor's personal full name on their User account. Distinct
   *  from the store name. */
  fullName?: string | null;
  /** Vendor's personal phone on their User account. Distinct from
   *  `phone`, which is the storefront's public contact number. */
  userPhoneNumber?: string | null;
  address: string | null;
  logoUrl: string | null;
  accountName?: string | null;
  accountNumber?: string;
  discountOnAllProducts?: string | null;
  bank: string | null;
  feeBearer: 'vendor' | 'customer' | 'included';
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  storeFrontJson: StoreFrontJson;
  vendor_locations: VendorLocation[] | null;
  vendor_delivery_charges?: VendorDelivery[] | null;
  vendor_custom_locations?: VendorCustomLocations[] | null;
  newestCatalogItems?: Product[] | null;
  vendorOnboardProgressResponse: VendorOnboardProgress;
  storeSubscription: StoreSubscription;
  slugUrl: string | null;
  isVerified: boolean;
  isEmailVerified: boolean;
  workingDaysHours?: WorkingHours[] | null;
  transferDirectlyToVendor: boolean;
  isServiceBased: boolean;
  templateId: string;
  isPublished: boolean;
  promoBanner: string | null;
  savedPaymentMethod: PaymentMethod | null;
}

export interface PaymentMethod {
  last4: string;
  expMonth?: string;
  expYear?: string;
  accountName?: string;
}

interface VendorOnboardProgress {
  addedFirstProduct: boolean,
  addedDeliveryLocations: boolean,
  updatedPersonsalProfile: boolean,
  setupPaymentMode: boolean,
}

interface StoreSubscription {
  daysRemaining: number;
  gracePeriodInDays: number;
  isTrial: boolean
}

export interface Product {
  id: string;
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
  faq?: string | null;
}

export interface WorkingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface VendorLocation {
  localGovernmentIds: string[];
  stateId: string
}

export interface VendorDelivery {
  localGovernmentId: string;
  charge: number
}

export interface VendorCustomLocations {
  name: string;
  deliveryCharge: string,
  id: string,
  stateId: string,
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const VendorProvider = ({ children }: { children: ReactNode }) => {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [isServiceBased, setIsServiceBased] = useState<boolean | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const processResponseData = (data: any): StoreData => {
    const processed = { ...data };
    if (processed.storeFrontJson && typeof processed.storeFrontJson === 'string') {
      try {
        processed.storeFrontJson = JSON.parse(processed.storeFrontJson);
      } catch (e) {
        console.error("Failed to parse storeFrontJson:", e);
      }
    }
    return processed;
  };

  // Stable reference (empty deps): callers like Home's useFocusEffect can
  // depend on this safely without re-firing on every VendorProvider render.
  // It only reads stable setters and stable imports — no state from closure.
  const fetchVendorData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStorefrontDetails();
      if (response) {
        const processedData = processResponseData(response);
        setStoreData(processedData);

        // Cache data
        AsyncStorage.setItem(STORE_DATA_CACHE, JSON.stringify(processedData)).catch(err =>
          console.error("AsyncStorage save error:", err)
        );

        // Pre-fill local fields
        setBusinessName(processedData.storeName || "");
        setIsServiceBased(processedData.isServiceBased);

        // Checklist logic. Display order matters — "Set up payments" sits
        // 3rd so the high-impact online-vs-manual decision is in front of
        // the vendor before the payout-bank step.
        if (processedData.vendorOnboardProgressResponse) {
          setChecklistItems([
            {
              id: 'add-delivery-locations',
              title: 'Add delivery locations',
              description: 'Tell customers where you deliver — without this, checkout stalls and orders can\'t be placed',
              completed: processedData.vendorOnboardProgressResponse.addedDeliveryLocations,
              isPrimary: true,
              route: "/vendor/locations"
            },
            {
              id: 'add-product',
              title: 'Add your first product',
              description: 'Upload product photos, set prices, and create your first listing',
              completed: processedData.vendorOnboardProgressResponse.addedFirstProduct,
              route: "/vendor/catalogs2"
            },
            {
              id: 'payment-mode',
              title: 'Set up payments',
              description: 'Choose how customers pay you — turn on online payment to let your store sell on its own',
              completed: processedData.vendorOnboardProgressResponse.setupPaymentMode,
            },
            {
              id: 'setup-payment',
              title: 'Add your payout bank',
              description: 'Tell us which bank account your earnings should land in',
              completed: processedData.vendorOnboardProgressResponse.updatedPersonsalProfile
            }
          ]);
        }
      }
    } catch (error) {
      console.error("Error fetching vendor data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateVendorSettings = async (updates: Partial<StoreData>) => {
    if (!storeData) return;
    setLoading(true);

    try {
      const updatedData = { ...storeData, ...updates };

      // Send to API (some backends might need stringified JSON, but let's try object first as it was working)
      // If the backend fails with object, we can add a check here.
      const response = await updateStorefrontSettings(updatedData);

      if (response) {
        setStoreData(updatedData);
        AsyncStorage.setItem(STORE_DATA_CACHE, JSON.stringify(updatedData)).catch(err =>
          console.error("AsyncStorage update error:", err)
        );
      }

      // Refresh to ensure server sync
      await fetchVendorData();
    } catch (error) {
      console.error("Error updating vendor settings:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cached = await AsyncStorage.getItem(STORE_DATA_CACHE);
        if (cached) {
          const parsed = JSON.parse(cached);
          const processed = processResponseData(parsed);
          setStoreData(processed);
          setBusinessName(processed.storeName || "");
          setIsServiceBased(processed.isServiceBased);
        }
      } catch (e) {
        console.error("Error loading cached data:", e);
      }
      fetchVendorData();
    };
    loadCachedData();
  }, []);

  // Wipe in-memory vendor state the moment the auth token clears, so a fresh
  // login on the same device never sees the previous user's store details.
  const { token } = useAuth();
  const prevTokenRef = useRef<string | null>(token);
  useEffect(() => {
    if (prevTokenRef.current && !token) {
      setBusinessName("");
      setDescription("");
      setIsServiceBased(null);
      setSelectedCategories([]);
      setStoreData(null);
      setChecklistItems([]);
    }
    prevTokenRef.current = token;
  }, [token]);

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
    setStoreData(null);
    AsyncStorage.removeItem(STORE_DATA_CACHE);
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
        fetchVendorData,
        updateVendorSettings,
        checklistItems,
        loading
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
