import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMyFeatures, MyFeaturesData } from "../api/vendor/vendor.api";
import { FeatureKey } from "../lib/features";

const FEATURES_KEY = ["my-features"] as const;

// AsyncStorage cache for the features payload. We persist the last-known
// good response so that on a fresh app launch the gates resolve
// optimistically against the cached set instead of defaulting to
// "everything locked" while the network round-trip is in flight. Without
// this, trial / paid users see a flash of locked padlocks every time
// they cold-start the app — confusing and looks broken.
const CACHE_KEY = "orderly:features-cache:v1";

/**
 * Resolves the vendor's currently-granted feature keys against the active
 * subscription plan. Null `keys` from the API means UNLIMITED access — the
 * `has()` helper short-circuits to true for every gate in that case.
 *
 * Cached for 5 minutes in TanStack Query and additionally persisted to
 * AsyncStorage so that a cold app launch can answer permission gates from
 * the previous session's result while the live query is still in flight.
 * Invalidate via `useInvalidateFeatures()` after a plan change so the UI
 * updates immediately on upgrade/downgrade.
 */
export function useFeatures() {
  // Persisted snapshot. Hydrated once on mount; cleared by the same
  // process that clears auth (see `clearAuthFromStorage` follow-up).
  const [persisted, setPersisted] = useState<MyFeaturesData | null>(null);
  const [persistedHydrated, setPersistedHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setPersisted(JSON.parse(raw) as MyFeaturesData);
          } catch {
            // Corrupt cache — ignore and let the live query repopulate.
          }
        }
      })
      .finally(() => setPersistedHydrated(true));
  }, []);

  const query = useQuery({
    queryKey: FEATURES_KEY,
    queryFn: getMyFeatures,
    staleTime: 5 * 60 * 1000,
  });

  // Mirror successful responses to AsyncStorage so the next cold start
  // can hydrate them. Failures don't touch the cache — we'd rather keep
  // the previous good answer than overwrite with nothing.
  useEffect(() => {
    if (query.data) {
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(query.data)).catch(() => {
        // Storage failure is non-fatal — TanStack Query keeps in-memory.
      });
    }
  }, [query.data]);

  // Prefer the freshly-fetched data, fall back to the persisted snapshot
  // while the network call is in flight. Only when both are absent (very
  // first install) does the gate logic see undefined.
  const effective: MyFeaturesData | null | undefined = query.data ?? persisted ?? undefined;

  const set = useMemo(() => {
    if (!effective) return undefined;
    const keys = effective.keys;
    return keys === null ? null : new Set<string>(keys ?? []);
  }, [effective]);

  const has = useMemo(() => {
    return (key: FeatureKey | string): boolean => {
      // Both fresh and cached are missing — first-ever launch. Return
      // false defensively so we don't leak paid features to a free
      // user who's never authenticated before.
      if (set === undefined) return false;
      // null set => unlimited plan, every gate passes.
      if (set === null) return true;
      return set.has(key);
    };
  }, [set]);

  return {
    has,
    isUnlimited: set === null,
    // True ONLY on the free trial. Distinct from `isUnlimited`: a paid
    // top-tier plan is also unlimited but is not a trial, so trial-only
    // messaging must gate on this flag, never on `isUnlimited`.
    isTrial: effective?.isTrial ?? false,
    planName: effective?.planName ?? null,
    // Plan-level seat budget for the Staff & permissions feature.
    // Wire convention: 0 or null = locked, positive integer = seat
    // cap (server-enforced). Surface raw so callers decide how to
    // present (e.g. lock the menu row, show seats remaining, etc.).
    staffLimit: effective?.staffLimit ?? null,
    // Daily quota for Orderly AI product-description generations.
    // Same wire convention as `staffLimit`: 0/null = locked, positive
    // int = daily cap, sentinel-large value for trial = unlimited.
    // The remaining-for-today count is NOT here — it's surfaced per-
    // generation via the response headers parsed in
    // `generateProductDescription`.
    aiDescriptionCreditsPerDay: effective?.aiDescriptionCreditsPerDay ?? null,
    // Max images per product on the active plan. null = plan doesn't
    // set it (callers fall back to the PRODUCTS_SECONDARY_IMAGE key),
    // positive int = slot cap, sentinel-large value (trial) = all slots.
    imagesPerProduct: effective?.imagesPerProduct ?? null,
    // `isLoading` only stays true until either the cache hydrates or the
    // network responds — gives screens a way to suppress paywall sheets
    // during the first render so they don't open against a stale state.
    isLoading: !query.data && !persisted && (query.isLoading || !persistedHydrated),
    isReady: query.data != null || persisted != null,
  };
}

export function useInvalidateFeatures() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: FEATURES_KEY });
    // Wipe the persisted snapshot too so a stale answer from a previous
    // plan can't beat the live refetch on the next render.
    AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
  };
}

/**
 * Warm the features cache ahead of first use. A brand-new vendor has
 * neither the AsyncStorage snapshot nor an in-flight query, so their very
 * first Home/product-form render would flash "everything locked" until
 * the network answers. SetupStep3 calls this the moment onboarding
 * commits so the trial's unlimited answer is already cached by the time
 * they reach the dashboard.
 */
export function usePrefetchFeatures() {
  const qc = useQueryClient();
  return () => {
    qc.prefetchQuery({ queryKey: FEATURES_KEY, queryFn: getMyFeatures }).catch(() => {});
  };
}
