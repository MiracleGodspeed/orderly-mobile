/**
 * Free, instant product-description suggestion — no LLM involved.
 * Deterministic: the same title always produces the same suggestion
 * (seeded by a hash of the title), while different titles land on
 * different sentence combinations, so a vendor's catalog doesn't read
 * as copy-pasted. This is the free tier; the paid "Orderly AI" button
 * remains the upgrade path for genuinely bespoke copy.
 *
 * Mirrored 1:1 from web `src/admin/lib/description-suggest.ts` — keep
 * the two files in sync.
 */

const QUALITY = [
  "made with quality you can see and feel",
  "carefully selected so you get exactly what you paid for",
  "the real deal, with no compromises on quality",
  "the kind of quality that speaks for itself",
  "picked for people who notice the details",
];

const FIT = [
  "Perfect for everyday use or as a thoughtful gift.",
  "A reliable choice you'll reach for again and again.",
  "Great for personal use and special moments alike.",
  "Whether it's for you or someone special, it delivers.",
  "An easy favourite — practical, presentable, and built to please.",
];

const CLOSER = [
  "Order now and we'll get it to you as quickly as possible.",
  "Available now, so order while it's still in stock.",
  "Tap order and it's yours. It really is that simple.",
  "Place your order today for quick processing and careful handling.",
];

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(pool: T[], seed: number, salt: number): T {
  return pool[(seed + salt * 2654435761) % pool.length];
}

/** Returns a 3-sentence suggestion, or null when the title is too thin
 *  to build anything sensible from. */
export function suggestDescription(title: string): string | null {
  const t = title.trim();
  if (t.length < 3) return null;
  const seed = hashSeed(t.toLowerCase());
  // Capitalize the first letter — unless the word looks intentionally
  // cased ("iPhone", "eBay"), i.e. the second character is uppercase.
  const name =
    t.length > 1 && t[1] === t[1].toUpperCase() && /[a-z]/i.test(t[1])
      ? t
      : t.charAt(0).toUpperCase() + t.slice(1);
  return `${name} is ${pick(QUALITY, seed, 1)}. ${pick(FIT, seed, 2)} ${pick(CLOSER, seed, 3)}`;
}
