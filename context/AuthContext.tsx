import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { login as loginApi } from "./../src/api/auth/auth.api";
import {setAuthToken} from "./../src/api/setAuthToken"
import { LoginResponse } from "../src/api/auth/auth.types";



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
  logout: () => void;
  setAuthData: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);



  const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const data = await loginApi({ email, password });

   
   
    setToken(data.token);
    setUser(data.user);

  
    return data;
  } catch (err: any) {
    console.error("Login API error:", err);

   
    throw err;
  }
};
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const setAuthData = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };


  return (
    <AuthContext.Provider value={{ user, token, login, logout, setAuthData }}>
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
