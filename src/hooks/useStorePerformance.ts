import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getStorePerformanceReport } from "../api/vendor/vendor.api";

export const STORE_PERFORMANCE_KEY = "store-performance";

interface UseStorePerformanceParams {
  /** Calendar-anchored start of the window, ISO UTC. */
  from?: string;
  /** Calendar-anchored end of the window, ISO UTC. */
  to?: string;
}

export function useStorePerformance({
  from,
  to,
}: UseStorePerformanceParams = {}) {
  return useQuery({
    queryKey: [STORE_PERFORMANCE_KEY, { from, to }],
    queryFn: () => getStorePerformanceReport(from, to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** Warm the cache for the default 30-day window. */
export function useInvalidateStorePerformance() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [STORE_PERFORMANCE_KEY] });
}
