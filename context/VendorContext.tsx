import React, { createContext, useContext, useState, ReactNode } from "react";

interface VendorContextType {
  businessName: string;
  description: string;
  isServiceBased: boolean | null;
  selectedCategories: number[];

  setBusinessInfo: (name: string, description: string) => void;
  setServiceType: (isService: boolean) => void;
  toggleCategory: (categoryId: number) => void;
  resetVendorData: () => void;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const VendorProvider = ({ children }: { children: ReactNode }) => {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [isServiceBased, setIsServiceBased] = useState<boolean | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

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
