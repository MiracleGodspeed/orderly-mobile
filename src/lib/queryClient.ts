import { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  orders: (params: { page: number; pageSize: number; search?: string }) =>
    ["orders", params] as const,
  products: (params: {
    page: number;
    pageSize: number;
    search?: string;
    categoryId?: number;
    lowStockThreshold?: number;
  }) => ["products", params] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data is considered "fresh" for 60s — during that window the cache
      // is returned instantly with no network hit.
      staleTime: 60 * 1000,
      // Cached data is retained in memory for 10 minutes after all observers
      // unmount — reopening a screen within that window shows instantly.
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      // On mobile we control refetching explicitly via pull-to-refresh.
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
