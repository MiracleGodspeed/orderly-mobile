import { useEffect, useMemo } from "react";
import {
  keepPreviousData,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import { getPaidOrders, getUnpaidOrders } from "../api/vendor/vendor.api";
import { PaginatedOrdersResponse } from "../api/vendor/vendor.types";
import { queryKeys } from "../lib/queryClient";

export const ORDERS_PAGE_SIZE = 12;

interface UseOrdersParams {
  page?: number;
  search?: string;
  pageSize?: number;
}

const emptyPage: PaginatedOrdersResponse = {
  pageIndex: 1,
  pageSize: 0,
  totalCount: 0,
  totalPages: 0,
  code: "200",
  message: "",
  data: [],
};

// Manual bank-transfer orders are saved with status
// `pending_vendor_manual_confirmation` and surfaced through
// `/order-requests/get-unpaid-catalog-items`. Confirmed orders flip to
// `success` and move to `/get-paid-catalog-items`. The vendor needs both
// in one place — pending so they can act, paid so they have history — so
// useOrders merges the two buckets at the same page index and sorts by
// createdAt desc. totalCount is the sum so the Pagination component still
// renders accurate page counts.
export function useOrders({
  page = 1,
  search,
  pageSize = ORDERS_PAGE_SIZE,
}: UseOrdersParams = {}) {
  const trimmedSearch = search?.trim() || undefined;
  const params = { page, pageSize, search: trimmedSearch };

  const qc = useQueryClient();

  const results = useQueries({
    queries: [
      {
        queryKey: [...queryKeys.orders(params), "paid"] as const,
        queryFn: () =>
          getPaidOrders({
            pageIndex: params.page,
            pageSize: params.pageSize,
            search: params.search,
          }),
        placeholderData: keepPreviousData,
      },
      {
        queryKey: [...queryKeys.orders(params), "unpaid"] as const,
        queryFn: () =>
          getUnpaidOrders({
            pageIndex: params.page,
            pageSize: params.pageSize,
            search: params.search,
          }),
        placeholderData: keepPreviousData,
      },
    ],
  });

  const [paidQuery, unpaidQuery] = results;

  const merged = useMemo<PaginatedOrdersResponse>(() => {
    const paid = paidQuery.data ?? emptyPage;
    const unpaid = unpaidQuery.data ?? emptyPage;
    const data = [...(unpaid.data ?? []), ...(paid.data ?? [])].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
    return {
      pageIndex: page,
      pageSize,
      totalCount: (paid.totalCount ?? 0) + (unpaid.totalCount ?? 0),
      totalPages: Math.max(paid.totalPages ?? 0, unpaid.totalPages ?? 0),
      code: paid.code ?? unpaid.code ?? "200",
      message: paid.message ?? unpaid.message ?? "",
      data,
    };
  }, [paidQuery.data, unpaidQuery.data, page, pageSize]);

  const isPending = paidQuery.isPending || unpaidQuery.isPending;
  const isFetching = paidQuery.isFetching || unpaidQuery.isFetching;

  const refetch = async () => {
    await Promise.all([paidQuery.refetch(), unpaidQuery.refetch()]);
  };

  // Prefetch the next page in the background as soon as the current one
  // settles. We prefetch both buckets so paging forward stays instant.
  const totalCount = merged.totalCount;
  const hasNextPage = totalCount > page * pageSize;
  useEffect(() => {
    if (!hasNextPage) return;
    const nextParams = { page: page + 1, pageSize, search: trimmedSearch };
    qc.prefetchQuery({
      queryKey: [...queryKeys.orders(nextParams), "paid"] as const,
      queryFn: () =>
        getPaidOrders({
          pageIndex: nextParams.page,
          pageSize: nextParams.pageSize,
          search: nextParams.search,
        }),
    });
    qc.prefetchQuery({
      queryKey: [...queryKeys.orders(nextParams), "unpaid"] as const,
      queryFn: () =>
        getUnpaidOrders({
          pageIndex: nextParams.page,
          pageSize: nextParams.pageSize,
          search: nextParams.search,
        }),
    });
  }, [hasNextPage, page, pageSize, trimmedSearch, qc]);

  return {
    data: merged,
    isPending,
    isFetching,
    refetch,
  };
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
      queryKey: [...queryKeys.orders(params), "paid"] as const,
      queryFn: () =>
        getPaidOrders({
          pageIndex: 1,
          pageSize: ORDERS_PAGE_SIZE,
        }),
    });
    qc.prefetchQuery({
      queryKey: [...queryKeys.orders(params), "unpaid"] as const,
      queryFn: () =>
        getUnpaidOrders({
          pageIndex: 1,
          pageSize: ORDERS_PAGE_SIZE,
        }),
    });
  };
}
