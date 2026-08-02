/**
 * What a vendor calls the non-colour half of a product variant.
 *
 * "Size" is right for a clothing seller and meaningless for a
 * bookshop: a novel comes in a hardcover or a paperback, a perfume in
 * 30ml or 100ml. Vendors in those trades read "Size" and conclude the
 * feature isn't for them, so they never price their variants.
 *
 * Two outcomes only, on purpose:
 *
 *   Size    — the default, and the trades where the word is the one
 *             everybody already uses: clothing, wigs and hair, jewelry,
 *             footwear.
 *   Option  — trades where "Size" is positively wrong: books, perfumes,
 *             food, electronics. Trade-specific guesses like "Format"
 *             or "Capacity" were too narrow (a bookshop also sells
 *             pens), and a wrong specific word is worse than a right
 *             vague one. The *examples* still follow the trade, so a
 *             perfume seller is prompted with "30ml, 50ml, 100ml" even
 *             though the label reads Option.
 *
 * Size is the fallback for anything we can't place: no categories, the
 * "Others" bucket, a store spanning trades that disagree, or an API
 * build that doesn't send categories at all. Showing "Option" to a
 * vendor who sells sizes is a regression; showing "Size" to one who
 * doesn't is merely the status quo. So we only move off "Size" when we
 * positively know the trade.
 *
 * The same label is shown to buyers on the storefront. A vendor who
 * labels something "Option" and a customer who sees "Size" would be
 * looking at the same field under two names.
 *
 * The axis is resolved from the business categories the vendor picked
 * at onboarding, which the API returns on the storefront details
 * payload as `businessCategoryIds` / `businessCategoryNames`.
 *
 * Colour is deliberately left alone. A colour is a colour in every
 * trade, and a vendor who doesn't sell coloured things skips it.
 *
 * Kept in step with the web app's `orderly-nextjs/src/lib/variant-axis.ts`
 * — a vendor editing the same product on both surfaces must see the
 * same words.
 */

export interface VariantAxis {
  /** Singular, title case. "Size" or "Option". */
  one: string;
  /** Plural, title case, for section headings. */
  many: string;
  /** Singular, lower case, for mid-sentence use. */
  lower: string;
  /** Comma-separated examples for input placeholders. Follows the
   *  vendor's trade even when the label is the generic one. */
  examples: string;
  /** A single example value, used in the worked example. */
  sample: string;
}

const SIZE: VariantAxis = {
  one: "Size",
  many: "Sizes",
  lower: "size",
  examples: "S, M, L, XL",
  sample: "XL",
};

/** The generic label, with per-trade examples layered on below. */
const OPTION: VariantAxis = {
  one: "Option",
  many: "Options",
  lower: "option",
  examples: "e.g. Small, Large",
  sample: "Large",
};

const optionWith = (examples: string, sample: string): VariantAxis => ({
  ...OPTION,
  examples,
  sample,
});

export const DEFAULT_VARIANT_AXIS = SIZE;

/** Matched against the category name first, because ids are seeded
 *  per environment and can drift; the id map below is the fallback. */
const NAME_RULES: { match: RegExp; axis: VariantAxis }[] = [
  { match: /fashion|cloth|wear|wig|hair|shoe|footwear/i, axis: SIZE },
  { match: /jewel|accessor/i, axis: SIZE },
  {
    match: /perfume|scent|fragrance/i,
    axis: optionWith("30ml, 50ml, 100ml", "100ml"),
  },
  {
    match: /book|stationer/i,
    axis: optionWith("Hardcover, Paperback", "Hardcover"),
  },
  {
    match: /food|restaurant|meal|drink/i,
    axis: optionWith("Small, Medium, Large", "Large"),
  },
  {
    match: /electronic|gadget|phone|device/i,
    axis: optionWith("64GB, 128GB, 256GB", "256GB"),
  },
];

/** Ids as seeded in BusinessCategories. Used when names are absent. */
const ID_RULES: Record<number, VariantAxis> = {
  3: SIZE, // Fashion & Women's Clothing
  4: optionWith("64GB, 128GB, 256GB", "256GB"), // Electronics
  5: optionWith("30ml, 50ml, 100ml", "100ml"), // Perfumes & Scents
  7: SIZE, // Jewelries & Accessories
  10: optionWith("Small, Medium, Large", "Large"), // Food & Restaurant
  11: optionWith("Hardcover, Paperback", "Hardcover"), // Books & Stationery
};

/** True for the catch-all bucket, which we ignore when deciding. */
const isOthers = (name: string) => /^\s*others?\s*$/i.test(name);

export function resolveVariantAxis(input: {
  categoryIds?: number[] | null;
  categoryNames?: string[] | null;
  isServiceBased?: boolean | null;
}): VariantAxis {
  if (input.isServiceBased) return OPTION;

  const names = (input.categoryNames ?? []).filter(Boolean);
  const ids = input.categoryIds ?? [];

  const matched: VariantAxis[] = [];

  for (const name of names) {
    if (isOthers(name)) continue;
    const rule = NAME_RULES.find((r) => r.match.test(name));
    if (rule) matched.push(rule.axis);
  }

  // Only fall back to ids when names told us nothing at all.
  if (matched.length === 0 && names.length === 0) {
    for (const id of ids) {
      const axis = ID_RULES[id];
      if (axis) matched.push(axis);
    }
  }

  // Nothing we recognise: leave the vendor on "Size" rather than
  // renaming a field out from under them.
  if (matched.length === 0) return SIZE;

  // One distinct label wins.
  const distinctLabels = new Set(matched.map((a) => a.one));
  if (distinctLabels.size === 1) {
    const first = matched[0];
    // Same label, different examples (books + food, say) — keep the
    // label, drop the examples rather than mislead with one trade's.
    const sameExamples = matched.every((a) => a.examples === first.examples);
    return sameExamples ? first : { ...first, ...OPTION_EXAMPLES_FOR(first) };
  }

  // Trades that disagree (a boutique that also sells perfume). Size is
  // the safer half of that pair.
  return SIZE;
}

/** Neutral examples for a label whose trades disagree on them. */
function OPTION_EXAMPLES_FOR(axis: VariantAxis): Pick<
  VariantAxis,
  "examples" | "sample"
> {
  return axis.one === SIZE.one
    ? { examples: SIZE.examples, sample: SIZE.sample }
    : { examples: OPTION.examples, sample: OPTION.sample };
}
