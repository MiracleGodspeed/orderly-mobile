import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  login as loginApi,
  googleLogin as googleLoginApi,
  appleLogin as appleLoginApi,
  AppleLoginPayload,
  revokeRefreshToken,
} from "./../src/api/auth/auth.api";
import { setAuthToken, registerForcedSignOutCallback } from "./../src/api/setAuthToken";
import { LoginResponse } from "../src/api/auth/auth.types";
import {
  registerDeviceForPush,
  unregisterDeviceFromPush,
} from "../src/hooks/usePushNotifications";
import {
  getPaidOrders,
  getProducts,
  getStorePerformanceReport,
  getAvailablePlans,
} from "../src/api/vendor/vendor.api";
import { queryKeys } from "../src/lib/queryClient";
import { ORDERS_PAGE_SIZE } from "../src/hooks/useOrders";
import { PRODUCTS_PAGE_SIZE } from "../src/hooks/useProducts";
import { STORE_PERFORMANCE_KEY } from "../src/hooks/useStorePerformance";
import { Platform } from "react-native";
import { fetchAppleSubscriptions } from "../src/lib/appleIap";
import { collectAppleSkusFromPlans } from "../src/lib/appleIapConfig";
import {
  saveAuthToStorage,
  clearAuthFromStorage,
  getAuthFromStorage,
  getRefreshTokenFromStorage,
} from "./auth.storage";



interface User {
  id: string;
  email: string;
  name?: string;
  storeId: string;
  userStatus?: number;
  /** Wire role from the login response — either an integer
   *  (1=Admin, 2=Vendor, 6=Staff) or the enum name string
   *  ("Vendor", "Staff", etc.) depending on backend version.
   *  Persisted on User so `useStaffPermissions` can read it
   *  synchronously from context, avoiding the JWT-decode timing
   *  race that hides Owner UI until the user logs out & back in. */
  role?: number | string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  googleLogin: (idToken: any) => Promise<LoginResponse>;
  appleLogin: (payload: AppleLoginPayload) => Promise<LoginResponse>;
  logout: () => Promise<void>;
 setAuthData: (
    token: string,
    user: User,
    refreshToken?: string | null,
    refreshTokenExpiresAt?: string | null
  ) => Promise<void>;

   isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const { token, user } = await getAuthFromStorage();

        if (token && user) {
          setToken(token);
          setUser(user);
        }
      } catch (e) {
        console.error("Failed to restore auth", e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuth();
  }, []);


  const queryClient = useQueryClient();

  // Hand the axios interceptor a way to flush React state when a
  // refresh-failed 401 forces a sign-out — the storage clears, but
  // without this the screen wouldn't react until next mount.
  useEffect(() => {
    registerForcedSignOutCallback(() => {
      setToken(null);
      setUser(null);
      queryClient.clear();
    });
    return () => registerForcedSignOutCallback(null);
  }, [queryClient]);

  useEffect(() => {
    setAuthToken(token);

    if (token) {
      // Register the device for push once we have a valid auth token.
      // The server extracts the user ID from the bearer token, so we must
      // wait until after setAuthToken has run.
      registerDeviceForPush().catch(() => {});

      // Warm the cache in the background so Orders / ProductsList open
      // instantly the first time the vendor taps into them.
      const ordersKey = queryKeys.orders({
        page: 1,
        pageSize: ORDERS_PAGE_SIZE,
        search: undefined,
      });
      const productsKey = queryKeys.products({
        page: 1,
        pageSize: PRODUCTS_PAGE_SIZE,
        search: undefined,
      });

      queryClient.prefetchQuery({
        queryKey: ordersKey,
        queryFn: () =>
          getPaidOrders({ pageIndex: 1, pageSize: ORDERS_PAGE_SIZE }),
      });
      queryClient.prefetchQuery({
        queryKey: productsKey,
        queryFn: () =>
          getProducts({ pageIndex: 1, pageSize: PRODUCTS_PAGE_SIZE }),
      });
      // Default Home dashboard window is 30 days — warm that too.
      queryClient.prefetchQuery({
        queryKey: [
          STORE_PERFORMANCE_KEY,
          { duration: 30, from: undefined, to: undefined },
        ],
        queryFn: () => getStorePerformanceReport(30),
      });

      // Subscription pre-warm. Two-stage:
      //
      //   1. Pull the plans catalogue into the React-Query cache
      //      under the same key `usePlans()` reads from, so the
      //      Choose-Your-Plan screen renders synchronously when
      //      the vendor eventually opens it — no spinner gap.
      //
      //   2. AFTER plans land, on iOS only, fire a StoreKit
      //      `fetchAppleSubscriptions(allSkus)` to pre-warm Apple's
      //      product list. expo-iap caches that internally, so the
      //      pre-flight on PaymentMethodStep ("Checking with the
      //      App Store…") resolves from cache instead of round-
      //      tripping to Apple on every screen open. Wrapped in
      //      catch — failures here are non-fatal; the payment-step
      //      pre-flight has its own retry path with an inline error
      //      banner if Apple is genuinely unreachable.
      //
      // We use `fetchQuery` (not `prefetchQuery`) for stage 1 so we
      // can await the plans before chaining stage 2. Wrapped in an
      // IIFE so the useEffect itself stays sync.
      (async () => {
        try {
          const plans = await queryClient.fetchQuery({
            queryKey: queryKeys.plans(),
            queryFn: getAvailablePlans,
          });
          if (Platform.OS === "ios") {
            const skus = collectAppleSkusFromPlans(plans);
            if (skus.length > 0) {
              fetchAppleSubscriptions(skus).catch(() => {});
            }
          }
        } catch {
          // Plans prefetch failed (network blip on cold-start);
          // RenewSubscriptionStep will refetch on its own when the
          // vendor opens it. Non-fatal — don't disturb the rest of
          // the login flow.
        }
      })();
    }
  }, [token, queryClient]);



 const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  try {
    const data = await loginApi({ email, password });

    const user: User = {
      id: data.userId,
      email: data.email,
      name: data.fullName ?? undefined,
      storeId: data.storeId,
      userStatus: data.userStatus,
      // Role is persisted on User so useStaffPermissions reads it
      // synchronously from context (no JWT-decode race). Wire it
      // through from the login response so it's set in the same
      // tick as the token + user id.
      role: data.role,
    };

    // Order matters here — fixes two distinct bugs:
    //
    //   1. **Storage first.** The token + refresh token must be in
    //      AsyncStorage BEFORE the React-state token change triggers
    //      the [token]-dep useEffect that fires the cache-warm
    //      prefetch queries. Without this order, a prefetch could
    //      race ahead, 401 (axios still on the old/null token), hit
    //      `performRefresh` which finds no refresh token in storage,
    //      return null, and call `forceSignOut` → `reset('Splash')`
    //      — that's the "splash flash after login" the user reported.
    //
    //   2. **Axios sync update.** Calling `setAuthToken` here makes
    //      the axios interceptor pick up the new token immediately,
    //      not after React commits the render. Eliminates the window
    //      where Login.tsx's `await fetchVendorData()` could fire
    //      with the previous token.
    //
    //   3. **React state last.** The `setToken`/`setUser` calls
    //      then propagate through context to Home / BottomNav, which
    //      decide owner-vs-staff UI off `user.role`. By this point
    //      everything else is in place, so the first paint of Home
    //      already shows the correct surfaces.
    await saveAuthToStorage(
      data.token,
      user,
      data.refreshToken,
      data.refreshTokenExpiresAt
    );
    setAuthToken(data.token);
    setToken(data.token);
    setUser(user);

    return data;
  } catch (err) {
    console.error("Login API error:", err);
    throw err;
  }
};

 const googleLogin = async (idToken: any): Promise<LoginResponse> => {
  try {
    const data = await googleLoginApi(idToken);
    const user: User = {
      id: data.userId,
      email: data.email,
      name: data.fullName ?? undefined,
      storeId: data.storeId,
      userStatus: data.userStatus,
      role: data.role,
    };

    // Storage-first → axios sync → React state. Same ordering as
    // `login()` above; see the comment there for why.
    await saveAuthToStorage(
      data.token,
      user,
      data.refreshToken,
      data.refreshTokenExpiresAt
    );
    setAuthToken(data.token);
    setToken(data.token);
    setUser(user);

    return data;
  } catch (err) {
    console.error("Google Login API error:", err);
    throw err;
  }
};

 const appleLogin = async (
  payload: AppleLoginPayload
): Promise<LoginResponse> => {
  try {
    const data = await appleLoginApi(payload);
    const user: User = {
      id: data.userId,
      email: data.email,
      name: data.fullName ?? undefined,
      storeId: data.storeId,
      userStatus: data.userStatus,
      role: data.role,
    };

    // Storage-first → axios sync → React state. Same ordering as
    // `login()` above; see the comment there for why.
    await saveAuthToStorage(
      data.token,
      user,
      data.refreshToken,
      data.refreshTokenExpiresAt
    );
    setAuthToken(data.token);
    setToken(data.token);
    setUser(user);

    return data;
  } catch (err) {
    console.error("Apple Login API error:", err);
    throw err;
  }
};

 const logout = async () => {
  // Unregister the device first so the bearer token is still present
  // when the request goes out.
  try {
    await unregisterDeviceFromPush();
  } catch {
    // ignore — local logout should always succeed
  }

  // Best-effort revoke on the server so the refresh token can't be
  // used again. Swallow errors — we always clear local state below.
  const storedRefresh = await getRefreshTokenFromStorage();
  if (storedRefresh) {
    await revokeRefreshToken(storedRefresh);
  }

  setToken(null);
  setUser(null);
  queryClient.clear();
  await clearAuthFromStorage();
};

 const setAuthData = async (
  newToken: string,
  newUser: User,
  refreshToken?: string | null,
  refreshTokenExpiresAt?: string | null
) => {
  // Same storage-first → axios sync → React state ordering as the
  // login methods. Used by post-OTP / signup paths that hand back
  // an auth payload outside the standard login() flow.
  await saveAuthToStorage(newToken, newUser, refreshToken, refreshTokenExpiresAt);
  setAuthToken(newToken);
  setToken(newToken);
  setUser(newUser);
};

 if (isLoading) return null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        googleLogin,
        appleLogin,
        logout,
        setAuthData,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
