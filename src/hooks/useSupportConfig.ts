import { useQuery } from "@tanstack/react-query";
import { getSupportConfig } from "../api/support/support.api";

const SUPPORT_CONFIG_KEY = ["support", "config"] as const;

/**
 * Cached fetch for the support config. The config is admin-controlled
 * and changes rarely, so a 5-min staleTime keeps the Help screen
 * snappy on re-entry without going stale for hours at a time.
 */
export function useSupportConfig() {
  return useQuery({
    queryKey: SUPPORT_CONFIG_KEY,
    queryFn: getSupportConfig,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
