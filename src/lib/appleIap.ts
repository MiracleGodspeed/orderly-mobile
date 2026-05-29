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
    console.log("[IAP] purchaseUpdated event:", {
      productId: purchase.productId,
      id: purchase.id,
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
    settlePendingResolver({
      ok: false,
      error: new Error(err?.message || "Subscription purchase failed"),
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
  let receipt = await getReceiptIOS();
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
      receipt = await requestReceiptRefreshIOS();
      console.log(
        "[IAP] receipt from requestReceiptRefreshIOS, length:",
        receipt?.length ?? 0,
      );
    } catch (e) {
      console.log("[IAP] requestReceiptRefreshIOS failed:", e);
    }
  }
  if (!receipt) {
    throw new Error(
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
