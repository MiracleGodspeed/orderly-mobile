import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from "react";
import { getStorefrontDetails, updateStorefrontSettings } from "../src/api/vendor/vendor.api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Image } from "react-native";
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
  fetchVendorData: () => Promise<StoreData | null>;
  updateVendorSettings: (updates: Partial<StoreData>) => Promise<void>;
  checklistItems: ChecklistItem[];
  loading: boolean;
  /** True for a short window right after a vendor completes onboarding,
   *  while the free-trial subscription is still being provisioned
   *  server-side. During this window `get-storefront-details` briefly
   *  returns an unprovisioned subscription (isTrial:false / 0 days) that
   *  is indistinguishable from a genuinely-expired one — so consumers
   *  (the status banner) suppress the "expired" state until it settles. */
  justOnboarded: boolean;
  /** Call right after onboarding completes. Flips `justOnboarded` on and
   *  kicks off a background poll that refetches until the trial appears. */
  markOnboarded: () => void;
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
  /** WhatsApp checkout mode — mutually exclusive with online payment
   *  and direct-to-vendor. When true, the storefront hands customers
   *  off to the vendor's WhatsApp with a pre-typed invoice instead
   *  of running Paystack or showing bank details. */
  whatsappCheckoutEnabled?: boolean;
  /** Digits-only WhatsApp number (10-15 digits, including country
   *  code) the storefront opens chats to. Set via the storefront's
   *  `/whatsapp-checkout-number` endpoint. */
  whatsappCheckoutNumber?: string | null;
  isServiceBased: boolean;
  templateId: string;
  isPublished: boolean;
  promoBanner: string | null;
  savedPaymentMethod: PaymentMethod | null;
  /** Custom domain stamped onto StoreSettings.CustomDomain after the
   *  admin marks a paid DomainOrder as Active. Null when the vendor
   *  hasn't bought one or theirs is still mid-provisioning. */
  customDomain?: string | null;
  /** Mirror of `StoreSettings.HasCustomDomain` — true when the admin
   *  (or the registrar webhook) has confirmed the domain. */
  hasCustomDomain?: boolean | null;
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
  const [justOnboarded, setJustOnboarded] = useState(false);

  // Read auth up-front: every server fetch in this provider hits an
  // *authenticated* storefront endpoint, so it must never fire while
  // logged out. A pre-login fetch 401s, and the axios interceptor
  // turns that 401 into a forced sign-out → `reset('Splash')`, which
  // is what bounced vendors back to the splash mid-onboarding / mid-OTP.
  const { token } = useAuth();

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
  const fetchVendorData = useCallback(async (): Promise<StoreData | null> => {
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

        // Return the freshly-fetched store so callers (e.g. the
        // post-onboarding poll in SetupStep3) can inspect the
        // subscription without waiting on the async `setStoreData`
        // state commit.
        return processedData;
      }
      return null;
    } catch (error) {
      console.error("Error fetching vendor data:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Flag the post-onboarding settle window. SetupStep3 calls this the moment
  // onboarding completes; the effect below then polls until the trial shows.
  const markOnboarded = useCallback(() => {
    setJustOnboarded(true);
  }, []);

  // Background settle poll. The free trial is provisioned a few seconds AFTER
  // onboarding finishes server-side — until it lands, `get-storefront-details`
  // returns a subscription that looks expired (isTrial:false / 0 days), which
  // the Home banner would render as "Subscription expired" for a vendor who
  // just signed up. Rather than block the setup modal racing that latency
  // (the trial can take longer than any reasonable spinner), we navigate
  // immediately and quietly refetch here every few seconds until the trial
  // appears — then clear the flag so the normal banner logic resumes. Capped
  // so it can never poll forever; if the trial genuinely never lands, the
  // real (expired) banner shows after the window, which is the correct signal.
  useEffect(() => {
    if (!justOnboarded || !token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const MAX_ATTEMPTS = 15; // ~45s at 3s spacing
    const INTERVAL_MS = 3000;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      const data = await fetchVendorData();
      if (cancelled) return;
      const sub = data?.storeSubscription;
      const settled = !!sub?.isTrial || (Number(sub?.daysRemaining) || 0) > 0;
      if (settled || attempts >= MAX_ATTEMPTS) {
        setJustOnboarded(false);
        return;
      }
      timer = setTimeout(tick, INTERVAL_MS);
    };

    timer = setTimeout(tick, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [justOnboarded, token, fetchVendorData]);

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

  // Hydrate from cache + server, but ONLY once authenticated. Keyed on
  // `token` so it runs the moment a vendor logs in (token appears) and
  // never while logged out — a logged-out `fetchVendorData()` 401s and
  // forces a sign-out → `reset('Splash')`. The cache read is also gated:
  // pre-login there's nothing valid to show, and a stale snapshot from a
  // previous session is cleared on logout anyway.
  useEffect(() => {
    if (!token) return;
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
  }, [token, fetchVendorData]);

  // Refetch whenever the app returns to the foreground. The subscription
  // banner (and any other view that reads off `storeData`) reflects
  // server-computed fields like `daysRemaining` / `gracePeriodInDays`
  // that drift while the app is backgrounded — without this, a vendor
  // who got a trial extension from support won't see it until they
  // fully kill + relaunch the app. `useFocusEffect` on Home covers
  // navigation transitions; this covers the "left the app, came back"
  // case it can't see.
  const appStateRef = useRef(AppState.currentState);
  // Latest token in a ref so the AppState listener (registered once) always
  // sees the current auth state without re-subscribing on every token change.
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const wasBackground =
        appStateRef.current === "background" ||
        appStateRef.current === "inactive";
      // Only refetch when authenticated. Pre-login, returning to the
      // foreground (e.g. the vendor flipped to their email app to grab
      // the OTP) used to fire an authed fetch that 401'd → forced
      // sign-out → `reset('Splash')`, throwing them back to square one.
      if (wasBackground && next === "active" && tokenRef.current) {
        fetchVendorData().catch(() => {});
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [fetchVendorData]);

  // Wipe in-memory vendor state the moment the auth token clears, so a fresh
  // login on the same device never sees the previous user's store details.
  const prevTokenRef = useRef<string | null>(token);
  useEffect(() => {
    if (prevTokenRef.current && !token) {
      setBusinessName("");
      setDescription("");
      setIsServiceBased(null);
      setSelectedCategories([]);
      setStoreData(null);
      setChecklistItems([]);
      setJustOnboarded(false);
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
        loading,
        justOnboarded,
        markOnboarded,
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
