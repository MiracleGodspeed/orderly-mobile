import { Platform } from "react-native";
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
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
    }
  | null = null;

function attachListenersOnce(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  purchaseUpdatedListener((purchase) => {
    console.log("[IAP] purchaseUpdated event:", {
      productId: purchase.productId,
      id: purchase.id,
      pendingFor: pendingResolver?.productId ?? null,
    });
    if (!pendingResolver) return;
    if (purchase.productId !== pendingResolver.productId) return;
    const resolver = pendingResolver;
    pendingResolver = null;
    resolver.resolve(purchase);
  });

  purchaseErrorListener((err) => {
    console.log("[IAP] purchaseError event:", {
      code: err?.code,
      message: err?.message,
      pendingFor: pendingResolver?.productId ?? null,
    });
    if (!pendingResolver) return;
    const resolver = pendingResolver;
    pendingResolver = null;
    const code = String(err?.code ?? "");
    if (code === "E_USER_CANCELLED" || code === "user-cancelled") {
      resolver.resolve(null);
      return;
    }
    resolver.reject(
      new Error(err?.message || "Apple Pay purchase failed"),
    );
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
    throw new Error("Apple Pay is only available on iOS");
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

  const purchase = await new Promise<Purchase | null>((resolve, reject) => {
    pendingResolver = { productId, resolve, reject };
    requestPurchase({
      request: { apple: { sku: productId } },
      type: "subs",
    }).catch((err) => {
      pendingResolver = null;
      reject(err);
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
