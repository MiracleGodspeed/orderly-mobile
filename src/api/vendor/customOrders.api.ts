import { apiClient } from "../client";

/**
 * The custom-orders module: the vendor's own questions, and the
 * vendor-defined option types that replace the hard-coded Size/Colour
 * pair on a product.
 *
 * Every call here is vendor-authenticated. The storefront reads its own
 * public endpoints; nothing customer-facing goes through this file.
 */

export type QuestionScope = "order" | "all_products" | "some_products";

export type QuestionFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "select"
  | "boolean";

export interface StoreQuestion {
  id: string;
  label: string;
  helpText: string | null;
  fieldType: QuestionFieldType;
  scope: QuestionScope;
  isRequired: boolean;
  sortOrder: number;
  choices: string[] | null;
  minNoticeDays: number | null;
  closedDays: number[] | null;
  showWhenQuestionId: string | null;
  showWhenValue: string | null;
  productIds: string[];
  productCount: number;
}

/** A ready-made question offered in the picker, chosen for the vendor's
 *  business category so they never face a blank builder. */
export interface QuestionStarter {
  key: string;
  label: string;
  helpText: string | null;
  fieldType: QuestionFieldType;
  scope: QuestionScope;
  isRequired: boolean;
  choices: string[] | null;
  minNoticeDays: number | null;
  icon: string | null;
}

/**
 * The whole screen in one call.
 *
 * `enabled` and `canEdit` are independent on purpose. A vendor who
 * downgrades keeps `enabled: true` — their storefront is live and still
 * collecting — with `canEdit: false`. The screen shows their questions
 * with the buttons disabled rather than hiding questions that are
 * quietly still running.
 */
export interface VendorQuestions {
  enabled: boolean;
  canEdit: boolean;
  questions: StoreQuestion[];
}

export interface SaveQuestionPayload {
  label: string;
  helpText?: string | null;
  fieldType: QuestionFieldType;
  scope: QuestionScope;
  isRequired: boolean;
  choices?: string[] | null;
  minNoticeDays?: number | null;
  closedDays?: number[] | null;
  showWhenQuestionId?: string | null;
  showWhenValue?: string | null;
  productIds?: string[] | null;
}

export interface VariantOption {
  id: string;
  label: string;
  priceDelta: number;
  sortOrder: number;
}

export interface VariantType {
  id: string;
  name: string;
  /** colour gives the vendor a palette and the customer swatches; list
   *  gives typed choices and tappable buttons. */
  kind: "colour" | "list";
  allowMultiple: boolean;
  isRequired: boolean;
  sortOrder: number;
  options: VariantOption[];
}

export interface SaveVariantTypesPayload {
  types: Array<{
    id?: string | null;
    name: string;
    kind: "colour" | "list";
    allowMultiple: boolean;
    isRequired: boolean;
    options: Array<{ id?: string | null; label: string; priceDelta: number }>;
  }>;
  /**
   * Per-variant price / stock rows, sent in the same call as the types
   * so the two can never disagree. Options are referenced by POSITION
   * because a brand-new one has no id until this request creates it.
   *
   * Omit the field entirely to leave existing rows untouched; send an
   * empty array to clear them. The server treats those differently on
   * purpose, so a client that doesn't manage combinations can't wipe
   * them by staying silent.
   */
  combinations?: SaveVariantCombinationPayload[];
}

export interface SaveVariantCombinationPayload {
  optionRefs: Array<{ typeIndex: number; optionIndex: number }>;
  /** Null returns this variant to the base price. */
  price: number | null;
  /** Null stops tracking stock for it. */
  stock: number | null;
}

/**
 * A price and/or stock count pinned to specific choices, e.g. one size
 * in one colour at its own price and stock. A row may name any subset of the
 * pick-one options; the most specific matching row wins at checkout.
 */
export interface VariantCombination {
  optionIds: string[];
  price: number | null;
  stock: number | null;
}

interface Envelope<T> {
  code: string;
  message: string;
  data: T;
}

/** Every write surfaces the server's own sentence. The API returns
 *  vendor-facing copy ("Add at least two choices for customers to pick
 *  from"), and rewriting it here would only make it vaguer. */
function unwrap<T>(response: { data: Envelope<T> }, fallback: string): T {
  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || fallback);
  }
  return response.data.data;
}

// ── Questions ──────────────────────────────────────────────────────

export const getQuestions = async (): Promise<VendorQuestions> => {
  const response = await apiClient.get<Envelope<VendorQuestions>>(
    "/custom-orders/questions",
    { validateStatus: () => true },
  );
  const data = unwrap(response, "Couldn't load your questions.");
  return {
    enabled: data?.enabled ?? false,
    canEdit: data?.canEdit ?? false,
    questions: data?.questions ?? [],
  };
};

export const getQuestionStarters = async (): Promise<QuestionStarter[]> => {
  const response = await apiClient.get<Envelope<QuestionStarter[]>>(
    "/custom-orders/questions/starters",
    { validateStatus: () => true },
  );
  // A failed starter fetch must never block the screen — the vendor can
  // still write their own question, which the picker already offers.
  if (response.data?.code !== "200") return [];
  return response.data.data ?? [];
};

export const createQuestion = async (
  payload: SaveQuestionPayload,
): Promise<StoreQuestion> => {
  const response = await apiClient.post<Envelope<StoreQuestion>>(
    "/custom-orders/questions",
    payload,
    { validateStatus: () => true },
  );
  return unwrap(response, "Couldn't add the question.");
};

export const updateQuestion = async (
  id: string,
  payload: SaveQuestionPayload,
): Promise<StoreQuestion> => {
  const response = await apiClient.put<Envelope<StoreQuestion>>(
    `/custom-orders/questions/${id}`,
    payload,
    { validateStatus: () => true },
  );
  return unwrap(response, "Couldn't save the question.");
};

export const deleteQuestion = async (id: string): Promise<void> => {
  const response = await apiClient.delete<Envelope<boolean>>(
    `/custom-orders/questions/${id}`,
    { validateStatus: () => true },
  );
  unwrap(response, "Couldn't remove the question.");
};

/** Sends the whole ordered list rather than a swap, so a dropped request
 *  can't leave two questions claiming one position. */
export const reorderQuestions = async (orderedIds: string[]): Promise<void> => {
  const response = await apiClient.post<Envelope<boolean>>(
    "/custom-orders/questions/reorder",
    { orderedIds },
    { validateStatus: () => true },
  );
  unwrap(response, "Couldn't save the new order.");
};

/** The vendor's master switch. Off means their storefront looks exactly
 *  as it does today, whatever questions they've written. */
export const setQuestionsModule = async (enabled: boolean): Promise<void> => {
  const response = await apiClient.post<Envelope<boolean>>(
    `/custom-orders/module?enabled=${enabled}`,
    undefined,
    { validateStatus: () => true },
  );
  unwrap(response, "Couldn't update that setting.");
};

// ── Variant types ──────────────────────────────────────────────────

export const getVariantTypes = async (
  catalogItemId: string,
): Promise<VariantType[]> => {
  const response = await apiClient.get<Envelope<VariantType[]>>(
    `/custom-orders/products/${catalogItemId}/variant-types`,
    { validateStatus: () => true },
  );
  if (response.data?.code !== "200") return [];
  return response.data.data ?? [];
};

export const getVariantCombinations = async (
  catalogItemId: string,
): Promise<VariantCombination[]> => {
  const response = await apiClient.get<Envelope<VariantCombination[]>>(
    `/custom-orders/products/${catalogItemId}/variant-combinations`,
    { validateStatus: () => true },
  );
  // A product with no rows is the common case and must never stop the
  // editor opening.
  if (response.data?.code !== "200") return [];
  return response.data.data ?? [];
};

export const saveVariantTypes = async (
  catalogItemId: string,
  payload: SaveVariantTypesPayload,
): Promise<VariantType[]> => {
  const response = await apiClient.put<Envelope<VariantType[]>>(
    `/custom-orders/products/${catalogItemId}/variant-types`,
    payload,
    { validateStatus: () => true },
  );
  return unwrap(response, "Couldn't save this product's options.") ?? [];
};
