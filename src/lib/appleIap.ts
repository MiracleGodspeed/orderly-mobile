import { Platform } from "react-native";
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
  type Purchase,
  type ProductSubscription,
} from "expo-iap";
import {
  getReceiptIOS,
  requestReceiptRefreshIOS,
} from "expo-iap/build/modules/ios";

/**
 * Thin wrapper around expo-iap for our subscription flow.
 *
 * expo-iap delivers purchase results through event listeners rather
 * than the return value of `requestPurchase`, so we bridge that with
 * a single pending-resolver. The wrapper API stays imperative
 * (`purchaseAppleSubscription` returns the purchase) so callers don't
 * have to think about the event model.
 *
 * On the receipt: PurchaseIOS carries the StoreKit 2 JWS in
 * `purchaseToken`, but our backend `verifyAppleReceipt` endpoint
 * still hits Apple's legacy `verifyReceipt` (which expects the
 * device-wide base64 receipt blob), so we fetch that explicitly via
 * `getReceiptIOS()` after the purchase completes.
 */

export interface ApplePurchase {
  transactionReceipt: string;
  transactionId: string;
  /**
   * StoreKit 2 JWS transaction token. Sent to the backend as a
   * fallback verification path when Apple's legacy `verifyReceipt`
   * rejects the receipt (common with sandbox StoreKit 2 receipts).
   */
  jws: string;
  raw: Purchase;
}

/**
 * Why a purchase attempt didn't end in a billable, completed
 * transaction. Lets the UI tell the truth instead of either claiming
 * success or showing a generic "failed":
 *
 *  - `deferred`  → StoreKit accepted the request but the transaction
 *                  is pending (billing problem / bad card, Ask-to-Buy,
 *                  or SCA). Nothing was charged; we must NOT show
 *                  success. Apple may complete it later out-of-band.
 *  - `no-receipt`→ purchase completed but Apple never handed us a
 *                  receipt blob to verify.
 *  - `timeout`   → we never heard back from StoreKit / Apple in time
 *                  (watchdog or receipt-fetch timeout fired).
 *  - `failed`    → StoreKit reported an outright purchase error.
 */
export type ApplePurchaseErrorKind =
  | "deferred"
  | "no-receipt"
  | "timeout"
  | "failed";

export class ApplePurchaseError extends Error {
  kind: ApplePurchaseErrorKind;
  constructor(kind: ApplePurchaseErrorKind, message: string) {
    super(message);
    this.name = "ApplePurchaseError";
    this.kind = kind;
  }
}

/**
 * Race a promise against a timeout so a StoreKit call that never
 * settles can't leave the Pay button spinning forever. The 90s
 * watchdog in `purchaseAppleSubscription` only covers `requestPurchase`
 * — the receipt-fetch leg (`getReceiptIOS` / `requestReceiptRefreshIOS`,
 * which calls `AppStore.sync()` and is known to stall) needs its own
 * bound or the spinner hangs after the purchase has already resolved.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new ApplePurchaseError("timeout", `Timed out: ${label}`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      },
    );
  });
}

let connectionReady = false;
let listenersAttached = false;
let pendingResolver:
  | {
      productId: string;
      resolve: (value: Purchase | null) => void;
      reject: (reason: unknown) => void;
      /** Watchdog timer cleared whenever the resolver settles. Guards
       *  against the "Pay button hangs forever" failure mode (see
       *  comment on `purchaseAppleSubscription`). */
      timeoutId: ReturnType<typeof setTimeout>;
    }
  | null = null;

/** Settle the pending resolver and clear its watchdog. Centralised so
 *  every listener / timer / error path goes through one code path
 *  that can't leak a timer or leave a stale resolver behind. */
function settlePendingResolver(
  outcome: { ok: true; value: Purchase | null } | { ok: false; error: unknown },
): void {
  if (!pendingResolver) return;
  const resolver = pendingResolver;
  pendingResolver = null;
  clearTimeout(resolver.timeoutId);
  if (outcome.ok) {
    resolver.resolve(outcome.value);
  } else {
    resolver.reject(outcome.error);
  }
}

function attachListenersOnce(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  purchaseUpdatedListener((purchase) => {
    const state = (purchase as { purchaseState?: string }).purchaseState;
    console.log("[IAP] purchaseUpdated event:", {
      productId: purchase.productId,
      id: purchase.id,
      state: state ?? "(none)",
      pendingFor: pendingResolver?.productId ?? null,
    });
    if (!pendingResolver) {
      // No active resolver — purchase arrived out-of-band. Common
      // causes: StoreKit replaying an unfinished transaction on app
      // launch, an in-app renewal pushed by Apple, or a family-shared
      // entitlement. We don't try to handle it here (would need a
      // plan/cycle to verify against), but the safety net is the
      // user's "Restore Purchases" button which re-queries
      // `getAvailablePurchases` and processes anything still unacked.
      return;
    }
    if (purchase.productId !== pendingResolver.productId) {
      // Different SKU from the one we requested — could be a renewal
      // for a previously-active subscription firing during this buy
      // session. Don't resolve the wrong purchase; keep the resolver
      // waiting for the matching one (with the timeout below as the
      // ultimate fallback so the user can never get stuck).
      console.log(
        "[IAP] purchase productId mismatch — keeping resolver pending",
        { received: purchase.productId, expected: pendingResolver.productId },
      );
      return;
    }
    // Gate on the StoreKit transaction state. expo-iap delivers this
    // listener for NON-completed transactions too — a `pending`
    // (deferred) transaction is what a bad/expired card, Ask-to-Buy,
    // or SCA produces: Apple may show "You're all set" optimistically
    // but nothing has actually been billed. Treating that as success
    // is exactly the bug where a vendor with no working card is told
    // the purchase went through. Only `purchased` is a real, billable
    // completion. (`purchaseState` is undefined on older native shapes
    // — fall through to the legacy resolve-as-success path then so we
    // never regress devices that don't report a state.)
    if (state === "pending") {
      settlePendingResolver({
        ok: false,
        error: new ApplePurchaseError(
          "deferred",
          "Apple hasn't confirmed payment for this subscription. If your " +
            "card was declined, update your payment method in Settings → " +
            "Apple ID → Payment & Shipping, then try again.",
        ),
      });
      return;
    }
    if (state && state !== "purchased") {
      // 'unknown' or any future non-final state — don't claim success.
      // Keep the resolver waiting; the 90s watchdog is the backstop so
      // the user still can't get stuck.
      console.log(
        "[IAP] purchase in non-final state — keeping resolver pending",
        { state },
      );
      return;
    }
    settlePendingResolver({ ok: true, value: purchase });
  });

  purchaseErrorListener((err) => {
    console.log("[IAP] purchaseError event:", {
      code: err?.code,
      message: err?.message,
      pendingFor: pendingResolver?.productId ?? null,
    });
    if (!pendingResolver) return;
    const code = String(err?.code ?? "");
    if (code === "E_USER_CANCELLED" || code === "user-cancelled") {
      settlePendingResolver({ ok: true, value: null });
      return;
    }
    // Deferred / pending payment — StoreKit took the request but the
    // charge hasn't (and may never) clear: bad card, Ask-to-Buy, or
    // SCA. Surface it as a distinct "deferred" outcome so the UI tells
    // the truth instead of either claiming success or showing a
    // generic failure. (openiap reports this as `deferred-payment` /
    // `pending`; older bridges use `E_DEFERRED_PAYMENT`.)
    if (
      code === "deferred-payment" ||
      code === "E_DEFERRED_PAYMENT" ||
      code === "pending"
    ) {
      settlePendingResolver({
        ok: false,
        error: new ApplePurchaseError(
          "deferred",
          "Apple hasn't confirmed payment for this subscription. If your " +
            "card was declined, update your payment method in Settings → " +
            "Apple ID → Payment & Shipping, then try again.",
        ),
      });
      return;
    }
    settlePendingResolver({
      ok: false,
      error: new ApplePurchaseError(
        "failed",
        err?.message || "Subscription purchase failed",
      ),
    });
  });
}

export async function initIap(): Promise<void> {
  if (Platform.OS !== "ios") return;
  if (connectionReady) return;
  attachListenersOnce();
  try {
    const result = await initConnection();
    console.log("[IAP] initConnection result:", result);
    connectionReady = true;
  } catch (e: unknown) {
    console.log("[IAP] initConnection failed:", e);
    throw e;
  }
}

export async function teardownIap(): Promise<void> {
  if (Platform.OS !== "ios") return;
  if (!connectionReady) return;
  try {
    await endConnection();
  } finally {
    connectionReady = false;
  }
}

export async function fetchAppleSubscriptions(
  skus: string[],
): Promise<ProductSubscription[]> {
  if (Platform.OS !== "ios") return [];
  if (!skus || skus.length === 0) return [];
  await initIap();
  const result = await fetchProducts({ skus, type: "subs" });
  return result as ProductSubscription[];
}

export async function purchaseAppleSubscription(
  productId: string,
): Promise<ApplePurchase | null> {
  if (Platform.OS !== "ios") {
    throw new Error("Subscriptions are only available on iOS");
  }
  await initIap();

  // Pre-flight: ask StoreKit if the SKU actually exists in this app's
  // App Store Connect listing. `requestPurchase` will fail with the
  // opaque "SKU not found" otherwise; doing this first surfaces a
  // clearer error and lets us log what we did/didn't find.
  console.log("[IAP] requesting purchase for SKU:", productId);
  const products = (await fetchProducts({
    skus: [productId],
    type: "subs",
  })) as ProductSubscription[];
  console.log(
    "[IAP] StoreKit returned products:",
    products.map((p) => p.id),
  );
  if (!products.find((p) => p.id === productId)) {
    throw new Error(
      `Apple couldn't find this subscription (${productId}). Confirm the product exists in App Store Connect and is "Ready to Submit", and that the device is signed into a Sandbox tester account.`,
    );
  }

  if (pendingResolver) {
    // A previous purchase is still in flight (likely a double-tap on
    // the Pay button while StoreKit / backend verification was still
    // resolving). Reject the new call rather than the old one so the
    // existing purchase finishes naturally and we don't spawn a
    // duplicate StoreKit transaction.
    throw new Error(
      "A purchase is already in progress. Please wait a moment.",
    );
  }

  // 90s watchdog on the pending resolver — guards against the
  // "tapped Pay, nothing happens" failure mode where StoreKit fires
  // an event we silently drop (e.g. mismatched productId from a
  // promotional-offer variant, or the event listener teardown racing
  // a background → foreground transition). Without this, the
  // resolver promise would hang forever and the user would see the
  // Pay button spin indefinitely. Apple's reviewer flagged exactly
  // this symptom under 2.1(b). The timer is cleared by
  // `settlePendingResolver` on every settle path.
  const purchase = await new Promise<Purchase | null>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      settlePendingResolver({
        ok: false,
        error: new Error(
          "We didn't hear back from Apple in time. Please try again, or use Restore Purchases if you've already been charged.",
        ),
      });
    }, 90_000);
    pendingResolver = { productId, resolve, reject, timeoutId };
    requestPurchase({
      request: { apple: { sku: productId } },
      type: "subs",
    }).catch((err) => {
      settlePendingResolver({ ok: false, error: err });
    });
  });

  if (!purchase) return null;

  // Log the purchase's StoreKit 2 JWS token so we can compare it
  // against the legacy app receipt below. If `getReceiptIOS()`
  // returns the same string, we know our wrapper is grabbing the
  // wrong format (JWS instead of legacy receipt) and Apple's
  // `verifyReceipt` will reject it as malformed.
  const purchaseToken = (purchase as { purchaseToken?: string | null })
    .purchaseToken;
  console.log(
    "[IAP] purchase.purchaseToken length:",
    purchaseToken?.length ?? 0,
    "prefix:",
    purchaseToken?.slice(0, 60) ?? "(empty)",
  );

  // On a first purchase with a fresh Sandbox Tester, the receipt file
  // hasn't been flushed to disk yet — `getReceiptIOS()` returns "".
  // Fall back to `requestReceiptRefreshIOS()` which forces an
  // `AppStore.sync()` before reading, guaranteeing a populated blob.
  // Both reads are time-boxed: the purchase promise has already
  // resolved by here, so the watchdog above is gone — without these
  // bounds a stalled `AppStore.sync()` would leave the Pay button
  // spinning indefinitely (one of the "loads for eternity" paths).
  let receipt = await withTimeout(
    getReceiptIOS(),
    15_000,
    "getReceiptIOS",
  ).catch((e) => {
    console.log("[IAP] getReceiptIOS failed/timed out:", e);
    return "" as string;
  });
  console.log(
    "[IAP] receipt from getReceiptIOS, length:",
    receipt?.length ?? 0,
    "prefix:",
    receipt?.slice(0, 60) ?? "(empty)",
    "suffix:",
    receipt?.slice(-30) ?? "(empty)",
  );
  if (!receipt) {
    console.log("[IAP] receipt empty — calling requestReceiptRefreshIOS");
    try {
      receipt = await withTimeout(
        requestReceiptRefreshIOS(),
        20_000,
        "requestReceiptRefreshIOS",
      );
      console.log(
        "[IAP] receipt from requestReceiptRefreshIOS, length:",
        receipt?.length ?? 0,
      );
    } catch (e) {
      console.log("[IAP] requestReceiptRefreshIOS failed/timed out:", e);
    }
  }
  if (!receipt) {
    throw new ApplePurchaseError(
      "no-receipt",
      "Apple didn't return a receipt — please try again or contact support.",
    );
  }

  return {
    transactionReceipt: receipt,
    transactionId: purchase.id,
    jws: purchaseToken ?? "",
    raw: purchase,
  };
}

export async function finishAppleTransaction(
  purchase: ApplePurchase,
): Promise<void> {
  if (Platform.OS !== "ios") return;
  await finishTransaction({ purchase: purchase.raw, isConsumable: false });
}

/**
 * Result of a Restore Purchases attempt.
 *
 * - `count` — how many active or unfinished Apple purchases are
 *   currently held by this Apple ID for this app. Drives the
 *   "Restored X subscription(s)" vs "Nothing to restore" UX branch.
 * - `purchases` — the raw expo-iap Purchase rows (each carrying its
 *   own productId + transactionId + JWS token). Caller can hand
 *   these to the backend to re-sync subscription state.
 */
export interface AppleRestoreResult {
  count: number;
  purchases: Purchase[];
}

/**
 * Re-query Apple for any purchases this Apple ID still holds for
 * this app — active auto-renewable subscriptions plus any
 * non-consumable transactions that haven't been `finishTransaction`'d
 * yet. Required by guideline 3.1.2 (Restore Purchases must be a
 * functional, reachable affordance) and by 2.1(b) (the buy flow must
 * be recoverable on a fresh device / reinstall).
 *
 * Behaviour:
 *   - Empty list → caller renders "No purchases to restore"
 *   - Non-empty list → caller surfaces a success message and
 *     (optionally) hands each purchase to the backend so it can
 *     resurrect the subscription record for this device/account.
 *   - Network error / StoreKit failure → throws; caller surfaces an
 *     error toast. Apple's reviewer wants a real failure path here,
 *     not a silent no-op.
 *
 * The raw `Purchase` shape from expo-iap is intentionally exposed so
 * the caller can iterate (most flows will need the `productId` to
 * cross-walk against the plan list).
 */
export async function restoreApplePurchases(): Promise<AppleRestoreResult> {
  if (Platform.OS !== "ios") {
    throw new Error("Restore Purchases is only available on iOS");
  }
  await initIap();
  console.log("[IAP] restorePurchases — calling getAvailablePurchases");
  const purchases = (await getAvailablePurchases({
    // iOS-only flag: skip expired / consumed entries so we only
    // surface what could meaningfully resurrect a current entitlement.
    onlyIncludeActiveItemsIOS: true,
  })) as Purchase[];
  console.log(
    "[IAP] restorePurchases — found:",
    purchases.length,
    "skus:",
    purchases.map((p) => p.productId),
  );
  return { count: purchases.length, purchases };
}
