import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  login as loginApi,
  googleLogin as googleLoginApi,
  appleLogin as appleLoginApi,
  AppleLoginPayload,
} from "./../src/api/auth/auth.api";
import {setAuthToken} from "./../src/api/setAuthToken"
import { LoginResponse } from "../src/api/auth/auth.types";
import {
  registerDeviceForPush,
  unregisterDeviceFromPush,
} from "../src/hooks/usePushNotifications";
import {
  getPaidOrders,
  getProducts,
  getStorePerformanceReport,
} from "../src/api/vendor/vendor.api";
import { queryKeys } from "../src/lib/queryClient";
import { ORDERS_PAGE_SIZE } from "../src/hooks/useOrders";
import { PRODUCTS_PAGE_SIZE } from "../src/hooks/useProducts";
import { STORE_PERFORMANCE_KEY } from "../src/hooks/useStorePerformance";
import {
  saveAuthToStorage,
  clearAuthFromStorage,
  getAuthFromStorage,
} from "./auth.storage";



interface User {
  id: string;
  email: string;
  name?: string;
  storeId: string;
  userStatus?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  googleLogin: (idToken: any) => Promise<LoginResponse>;
  appleLogin: (payload: AppleLoginPayload) => Promise<LoginResponse>;
  logout: () => Promise<void>;
 setAuthData: (token: string, user: User) => Promise<void>;

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
    };

    setToken(data.token);
    setUser(user);

    await saveAuthToStorage(data.token, user);

    return data;
  } catch (err) {
    console.error("Login API error:", err);
    throw err;
  }
};

 const googleLogin = async (idToken: any): Promise<LoginResponse> => {
  //  console.log(idToken, "idToken")

  try {
    const data = await googleLoginApi(idToken);
    // console.log(data, "internalAuth")
    const user: User = {
      id: data.userId,
      email: data.email,
      name: data.fullName ?? undefined,
      storeId: data.storeId,
      userStatus: data.userStatus
    };

    setToken(data.token);
    setUser(user);

    await saveAuthToStorage(data.token, user);

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
    };

    setToken(data.token);
    setUser(user);

    await saveAuthToStorage(data.token, user);

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
  setToken(null);
  setUser(null);
  queryClient.clear();
  await clearAuthFromStorage();
};

 const setAuthData = async (newToken: string, newUser: User) => {
  setToken(newToken);
  setUser(newUser);
  await saveAuthToStorage(newToken, newUser);
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
