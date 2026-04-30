import { useEffect } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getPaidOrders } from "../api/vendor/vendor.api";
import { queryKeys } from "../lib/queryClient";

export const ORDERS_PAGE_SIZE = 12;

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
  const trimmedSearch = search?.trim() || undefined;
  const params = { page, pageSize, search: trimmedSearch };

  const qc = useQueryClient();
  const query = useQuery({
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

  // Prefetch the next page in the background as soon as the current page
  // settles. Tapping Next then resolves from cache instantly instead of
  // round-tripping the API.
  const totalCount = query.data?.totalCount ?? 0;
  const hasNextPage = totalCount > page * pageSize;
  useEffect(() => {
    if (!hasNextPage) return;
    const nextParams = { page: page + 1, pageSize, search: trimmedSearch };
    qc.prefetchQuery({
      queryKey: queryKeys.orders(nextParams),
      queryFn: () =>
        getPaidOrders({
          pageIndex: nextParams.page,
          pageSize: nextParams.pageSize,
          search: nextParams.search,
        }),
    });
  }, [hasNextPage, page, pageSize, trimmedSearch, qc]);

  return query;
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
