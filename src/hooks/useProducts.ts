import { useEffect } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getProducts } from "../api/vendor/vendor.api";
import { queryKeys } from "../lib/queryClient";

export const PRODUCTS_PAGE_SIZE = 12;

interface UseProductsParams {
  page?: number;
  search?: string;
  pageSize?: number;
  categoryId?: number;
  /** When set, server filters to products with `stock < lowStockThreshold`. */
  lowStockThreshold?: number;
}

export function useProducts({
  page = 1,
  search,
  pageSize = PRODUCTS_PAGE_SIZE,
  categoryId,
  lowStockThreshold,
}: UseProductsParams = {}) {
  const trimmedSearch = search?.trim() || undefined;
  const params = {
    page,
    pageSize,
    search: trimmedSearch,
    categoryId,
    lowStockThreshold,
  };

  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () =>
      getProducts({
        pageIndex: params.page,
        pageSize: params.pageSize,
        search: params.search,
        categoryId: params.categoryId,
        lowStockThreshold: params.lowStockThreshold,
      }),
    placeholderData: keepPreviousData,
  });

  // Prefetch the next page in the background as soon as the current page
  // settles. Tapping Next then resolves from cache instantly instead of
  // round-tripping the API.
  const totalCount = query.data?.totalCount ?? 0;
  const hasNextPage = totalCount > page * pageSize;
  useEffect(() => {
    if (!hasNextPage) return;
    const nextParams = {
      page: page + 1,
      pageSize,
      search: trimmedSearch,
      categoryId,
      lowStockThreshold,
    };
    qc.prefetchQuery({
      queryKey: queryKeys.products(nextParams),
      queryFn: () =>
        getProducts({
          pageIndex: nextParams.page,
          pageSize: nextParams.pageSize,
          search: nextParams.search,
          categoryId: nextParams.categoryId,
          lowStockThreshold: nextParams.lowStockThreshold,
        }),
    });
  }, [hasNextPage, page, pageSize, trimmedSearch, categoryId, lowStockThreshold, qc]);

  return query;
}

/**
 * Invalidates every cached products query — useful after create / update /
 * delete mutations.
 */
export function useInvalidateProducts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["products"] });
}

/**
 * Warm the cache in the background so ProductsList is instant on first open.
 */
export function usePrefetchProducts() {
  const qc = useQueryClient();
  return () => {
    const params = {
      page: 1,
      pageSize: PRODUCTS_PAGE_SIZE,
      search: undefined,
    };
    qc.prefetchQuery({
      queryKey: queryKeys.products(params),
      queryFn: () =>
        getProducts({
          pageIndex: 1,
          pageSize: PRODUCTS_PAGE_SIZE,
        }),
    });
  };
}
