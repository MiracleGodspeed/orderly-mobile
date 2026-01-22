import { VendorProvider } from "./VendorContext";
import { AuthProvider } from "./AuthContext";
import { ProgressProvider } from "./ProgressContext";
import React, { ReactNode } from "react";

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <AuthProvider>
      <ProgressProvider>
        <VendorProvider>
          {children}
        </VendorProvider>
      </ProgressProvider>
    </AuthProvider>
  );
};
