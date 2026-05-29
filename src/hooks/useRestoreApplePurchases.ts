import { useState } from "react";
import { Alert, Platform } from "react-native";
import { restoreApplePurchases } from "../lib/appleIap";
import { useVendor } from "../../context/VendorContext";

/**
 * Shared restore-purchases handler used by both `SubscriptionBilling`
 * and `LegalPolicies` (and anywhere else a "Restore Purchases" affordance
 * lands later). Behaviour mirrors what Apple's reviewer expects when they
 * tap the button on a fresh install:
 *
 *   - count > 0   → success message ("Restored N active subscription(s)")
 *                   + a vendor-data refetch so any server-side state
 *                     change re-hydrates the UI.
 *   - count === 0 → info message ("No active Apple subscriptions found")
 *   - error       → error message ("Couldn't reach the App Store…")
 *
 * Apple specifically requires the button to handle all three branches
 * visibly (3.1.2 + 2.1(b)). A no-op silent button is a known reject
 * trigger.
 *
 * Feedback is rendered via native `Alert.alert` rather than the
 * react-native-toast-notifications library — toasts on this screen
 * weren't surfacing for some users (the in-flight TestFlight build's
 * Restore button "loaded then nothing happened" because the toast
 * provider context didn't reach this screen tree for reasons we
 * never fully ran to ground). A native alert is unambiguous,
 * impossible to miss, and exactly what Apple's reviewer expects to
 * see when they tap a 3.1.2-required button — no risk of "no action
 * took" being cited again under 2.1(b).
 */

export function useRestoreApplePurchases() {
  const { fetchVendorData } = useVendor();
  const [restoring, setRestoring] = useState(false);

  const restore = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert(
        "Not available on this device",
        "Restore Purchases is an iOS feature for App Store subscriptions.",
      );
      return;
    }
    if (restoring) return;
    setRestoring(true);
    console.log("[restore] tapped — calling restoreApplePurchases");
    try {
      const result = await restoreApplePurchases();
      console.log("[restore] result.count:", result.count);
      if (result.count > 0) {
        // Surface the confirmation IMMEDIATELY — Apple's reviewer
        // (and any vendor) needs to see a response within a beat of
        // the tap, not after a backend round-trip. A previous build
        // awaited `fetchVendorData` first and the alert never fired
        // when the vendor-data call hung on a slow network.
        //
        // The backend already has a record of the original purchase
        // tied to the App Store transaction id, and the vendor's
        // `storeSubscription` already reflects it — the refetch
        // below is just to nudge the local UI to re-render, not to
        // actually create or re-verify the subscription. Safe to
        // fire-and-forget.
        Alert.alert(
          result.count === 1
            ? "Restored 1 active subscription"
            : `Restored ${result.count} active subscriptions`,
          "Your account is up to date. Pull to refresh if you don't see it yet.",
        );
        fetchVendorData().catch((e) => {
          console.warn(
            "[restore] vendor refetch failed after restore (non-fatal):",
            e,
          );
        });
      } else {
        Alert.alert(
          "No purchases to restore",
          "There are no active Apple subscriptions linked to this Apple ID. If you recently subscribed, wait a moment and try again.",
        );
      }
    } catch (e: any) {
      console.error("[restore] restorePurchases failed:", e);
      Alert.alert(
        "Couldn't reach the App Store",
        e?.message ?? "Please check your connection and try again.",
      );
    } finally {
      setRestoring(false);
    }
  };

  return { restore, restoring };
}
