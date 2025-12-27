import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { login as loginApi, googleLogin as googleLoginApi } from "./../src/api/auth/auth.api";
import {setAuthToken} from "./../src/api/setAuthToken"
import { LoginResponse } from "../src/api/auth/auth.types";
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
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  googleLogin: (idToken: string) => Promise<LoginResponse>;
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


  useEffect(() => {
    setAuthToken(token);
  }, [token]);



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

 const googleLogin = async (idToken: string): Promise<LoginResponse> => {
  try {
    const data = await googleLoginApi(idToken);

    const user: User = {
      id: data.userId,
      email: data.email,
      name: data.fullName ?? undefined,
      storeId: data.storeId,
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

 const logout = async () => {
  setToken(null);
  setUser(null);
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
