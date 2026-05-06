import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts } from "../api/vendor/vendor.api";
import { PRODUCTS_PAGE_SIZE } from "./useProducts";

// Mirror useProducts: products are stable enough to cache for 5 minutes
// without surprising the user. Edits invalidate via useInvalidateInfiniteProducts.
const PRODUCTS_STALE_TIME = 5 * 60 * 1000;
const PRODUCTS_GC_TIME = 15 * 60 * 1000;

interface UseInfiniteProductsParams {
  search?: string;
  pageSize?: number;
  /** When set, products are scoped to a single vendor-defined catalog category. */
  categoryId?: number;
}

export function useInfiniteProducts({
  search,
  pageSize = PRODUCTS_PAGE_SIZE,
  categoryId,
}: UseInfiniteProductsParams = {}) {
  const trimmedSearch = search?.trim() || undefined;

  return useInfiniteQuery({
    queryKey: [
      "products-infinite",
      { search: trimmedSearch, pageSize, categoryId },
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = await getProducts({
        pageIndex: pageParam,
        pageSize,
        search: trimmedSearch,
        categoryId,
      });
      return { ...page, _requestedPage: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const totalCount = lastPage.totalCount ?? 0;
      const totalPages =
        lastPage.totalPages && lastPage.totalPages > 0
          ? lastPage.totalPages
          : Math.ceil(totalCount / pageSize);
      const next = (lastPage._requestedPage ?? 1) + 1;
      return next <= totalPages ? next : undefined;
    },
    staleTime: PRODUCTS_STALE_TIME,
    gcTime: PRODUCTS_GC_TIME,
  });
}

export function useInvalidateInfiniteProducts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["products-infinite"] });
}
