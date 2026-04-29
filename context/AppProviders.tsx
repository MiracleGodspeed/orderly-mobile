import { VendorProvider } from "./VendorContext";
import { AuthProvider } from "./AuthContext";
import { ProgressProvider } from "./ProgressContext";
import React, { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/lib/queryClient";

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProgressProvider>
          <VendorProvider>
            {children}
          </VendorProvider>
        </ProgressProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
