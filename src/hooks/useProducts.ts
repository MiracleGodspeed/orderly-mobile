import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getProducts } from "../api/vendor/vendor.api";
import { queryKeys } from "../lib/queryClient";

export const PRODUCTS_PAGE_SIZE = 8;

interface UseProductsParams {
  page?: number;
  search?: string;
  pageSize?: number;
}

export function useProducts({
  page = 1,
  search,
  pageSize = PRODUCTS_PAGE_SIZE,
}: UseProductsParams = {}) {
  const params = { page, pageSize, search: search?.trim() || undefined };

  return useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () =>
      getProducts({
        pageIndex: params.page,
        pageSize: params.pageSize,
        search: params.search,
      }),
    placeholderData: keepPreviousData,
  });
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
