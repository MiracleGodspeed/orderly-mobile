// src/contexts/ProgressContext.tsx
import React, { createContext, useContext, useState } from 'react';

type ProgressContextType = {
  progress: number; // 0..1
  setProgress: (p: number) => void;
  resetProgress: () => void;
};

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgressState] = useState<number>(0);

  const setProgress = (p: number) => {
    // clamp between 0 and 1
    const clamped = Math.max(0, Math.min(1, p));
    setProgressState(clamped);
  };

  const resetProgress = () => setProgressState(0);

  return (
    <ProgressContext.Provider value={{ progress, setProgress, resetProgress }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
};
