import { useInfiniteQuery } from "@tanstack/react-query";
import { getPaidOrders } from "../api/vendor/vendor.api";
import { ORDERS_PAGE_SIZE } from "./useOrders";

interface UseInfiniteOrdersParams {
  search?: string;
  pageSize?: number;
}

export function useInfiniteOrders({
  search,
  pageSize = ORDERS_PAGE_SIZE,
}: UseInfiniteOrdersParams = {}) {
  const trimmedSearch = search?.trim() || undefined;

  return useInfiniteQuery({
    queryKey: ["orders-infinite", { search: trimmedSearch, pageSize }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = await getPaidOrders({
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
