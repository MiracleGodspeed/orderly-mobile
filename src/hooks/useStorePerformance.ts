import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getStorePerformanceReport } from "../api/vendor/vendor.api";

export const STORE_PERFORMANCE_KEY = "store-performance";

interface UseStorePerformanceParams {
  duration?: number; // days; undefined when using a custom from/to range
  from?: string; // ISO
  to?: string; // ISO
}

export function useStorePerformance({
  duration,
  from,
  to,
}: UseStorePerformanceParams = {}) {
  return useQuery({
    queryKey: [STORE_PERFORMANCE_KEY, { duration, from, to }],
    queryFn: () => getStorePerformanceReport(duration, from, to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** Warm the cache for the default 30-day window. */
export function useInvalidateStorePerformance() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [STORE_PERFORMANCE_KEY] });
}
