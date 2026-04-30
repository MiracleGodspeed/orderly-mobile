import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyFeatures } from "../api/vendor/vendor.api";
import { FeatureKey } from "../lib/features";

const FEATURES_KEY = ["my-features"] as const;

/**
 * Resolves the vendor's currently-granted feature keys against the active
 * subscription plan. Null `keys` from the API means UNLIMITED access — the
 * `has()` helper short-circuits to true for every gate in that case.
 *
 * Cached for 5 minutes since the set rarely changes within a session.
 * Invalidate via `useInvalidateFeatures()` after a plan change so the UI
 * updates immediately on upgrade/downgrade.
 */
export function useFeatures() {
  const query = useQuery({
    queryKey: FEATURES_KEY,
    queryFn: getMyFeatures,
    staleTime: 5 * 60 * 1000,
  });

  const set = useMemo(() => {
    const keys = query.data?.keys;
    return keys === null ? null : new Set<string>(keys ?? []);
  }, [query.data]);

  const has = useMemo(() => {
    return (key: FeatureKey | string): boolean => {
      // null set => unlimited plan, every gate passes.
      if (set === null) return true;
      return set.has(key);
    };
  }, [set]);

  return {
    has,
    isUnlimited: set === null,
    planName: query.data?.planName ?? null,
    isLoading: query.isLoading,
    isReady: !query.isLoading,
  };
}

export function useInvalidateFeatures() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: FEATURES_KEY });
}
