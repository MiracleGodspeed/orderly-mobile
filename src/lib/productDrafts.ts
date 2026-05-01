import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFTS_KEY = "product_drafts_v1";
export const MAX_DRAFTS = 7;

/**
 * Snapshot of an in-progress product. We deliberately store image *URIs*
 * rather than base64 because the picker hands us local `file://` paths that
 * persist across app launches — copying the bytes into AsyncStorage would
 * blow past the (~6MB) per-key limit on Android.
 */
export interface ProductDraft {
  id: number;
  createdAt: string;
  productName: string;
  /** Numeric ID of the selected catalog category, or null when no category
   *  is set. Older drafts (pre-category-dropdown) used a free-text `category`
   *  string, which we still accept for backward compat but no longer write. */
  catalogCategoryId?: number | null;
  /** @deprecated Kept only so legacy drafts still parse. New drafts use
   *  `catalogCategoryId`. */
  category?: string;
  price: string;
  stockQuantity: string;
  productDescription: string;
  productImages: string[];
  sizes: string[];
  colors: string[];
  features: string[];
  enableVariants: boolean;
  /** Optional per-variant price/stock map keyed by `${size}||${color}`.
   *  Persisted as a plain object so JSON round-trips cleanly. */
  variantPrices?: Record<string, { price: string; stock?: string }>;
}

export async function loadDrafts(): Promise<ProductDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDrafts(drafts: ProductDraft[]): Promise<void> {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export async function appendDraft(
  draft: Omit<ProductDraft, "id" | "createdAt">
): Promise<ProductDraft[]> {
  const existing = await loadDrafts();
  if (existing.length >= MAX_DRAFTS) {
    throw new Error(`You can only save up to ${MAX_DRAFTS} drafts.`);
  }
  const next: ProductDraft = {
    ...draft,
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };
  const updated = [next, ...existing];
  await saveDrafts(updated);
  return updated;
}

export async function deleteDraft(id: number): Promise<ProductDraft[]> {
  const existing = await loadDrafts();
  const updated = existing.filter((d) => d.id !== id);
  await saveDrafts(updated);
  return updated;
}
