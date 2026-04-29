import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts } from "../api/vendor/vendor.api";
import { PRODUCTS_PAGE_SIZE } from "./useProducts";

interface UseInfiniteProductsParams {
  search?: string;
  pageSize?: number;
}

export function useInfiniteProducts({
  search,
  pageSize = PRODUCTS_PAGE_SIZE,
}: UseInfiniteProductsParams = {}) {
  const trimmedSearch = search?.trim() || undefined;

  return useInfiniteQuery({
    queryKey: ["products-infinite", { search: trimmedSearch, pageSize }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = await getProducts({
        pageIndex: pageParam,
        pageSize,
        search: trimmedSearch,
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
  });
}

export function useInvalidateInfiniteProducts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["products-infinite"] });
}
