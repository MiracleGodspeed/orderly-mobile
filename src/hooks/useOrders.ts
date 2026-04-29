import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getPaidOrders } from "../api/vendor/vendor.api";
import { queryKeys } from "../lib/queryClient";

export const ORDERS_PAGE_SIZE = 10;

interface UseOrdersParams {
  page?: number;
  search?: string;
  pageSize?: number;
}

export function useOrders({
  page = 1,
  search,
  pageSize = ORDERS_PAGE_SIZE,
}: UseOrdersParams = {}) {
  const params = { page, pageSize, search: search?.trim() || undefined };

  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () =>
      getPaidOrders({
        pageIndex: params.page,
        pageSize: params.pageSize,
        search: params.search,
      }),
    // Keep the previous page's data visible while the next page loads — no
    // loading flicker between pagination / search debounces.
    placeholderData: keepPreviousData,
  });
}

/**
 * Warm the cache in the background so the Orders screen is instant on first open.
 * Call once after login.
 */
export function usePrefetchOrders() {
  const qc = useQueryClient();
  return () => {
    const params = { page: 1, pageSize: ORDERS_PAGE_SIZE, search: undefined };
    qc.prefetchQuery({
      queryKey: queryKeys.orders(params),
      queryFn: () =>
        getPaidOrders({
          pageIndex: 1,
          pageSize: ORDERS_PAGE_SIZE,
        }),
    });
  };
}
