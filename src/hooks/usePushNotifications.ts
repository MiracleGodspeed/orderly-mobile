import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  registerPushToken,
  unregisterPushToken,
} from "../api/notifications/notifications.api";
import {
  confirmManualPayment,
  rejectManualPayment,
} from "../api/vendor/vendor.api";
import { navigate } from "../navigation/NavigationService";
import { queryClient } from "../lib/queryClient";

// Push handlers run outside the React tree (module-level + raw expo
// listeners), so they reach into the singleton QueryClient directly
// instead of using the `useInvalidate*` hooks. The cache keys here MUST
// match the ones declared in the corresponding hooks — `["orders"]`
// covers paid + unpaid + every page (see useOrders), `["notifications"]`
// covers both the list and the unread-count badge.
function invalidateOrdersAndNotifications() {
  queryClient.invalidateQueries({ queryKey: ["orders"] });
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

// Push payloads with one of these `type` values imply the orders list
// has changed server-side — a new order was placed, or a manual payment
// is awaiting confirmation. Either case warrants nudging the cache so
// the vendor doesn't see a stale list when they tap through.
const ORDER_RELEVANT_PUSH_TYPES = new Set(["new_order", "manual_payment_confirm"]);

const STORED_TOKEN_KEY = "orderly.pushToken";

// Foreground-presentation behavior — show banner + play sound while app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#265CC7",
  });

  await Notifications.setNotificationChannelAsync("orders", {
    name: "New Orders",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#265CC7",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("subscription", {
    name: "Subscription",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#265CC7",
  });
}

// Identifier the backend stamps on actionable pushes for manual bank
// transfers. Both sides MUST agree on this string — it's how iOS /
// Android know to render the [Confirm Payment] / [Reject] buttons under
// the notification body.
const MANUAL_PAYMENT_CATEGORY = "manual_payment_confirm";
const ACTION_CONFIRM = "confirm_payment";
const ACTION_REJECT = "reject_payment";

/**
 * Registers the notification categories that drive the action buttons
 * on push notifications. Call once at app boot. Idempotent — safe to
 * re-run on every cold start.
 */
async function ensureNotificationCategories() {
  try {
    await Notifications.setNotificationCategoryAsync(MANUAL_PAYMENT_CATEGORY, [
      {
        identifier: ACTION_CONFIRM,
        buttonTitle: "Confirm payment",
        // Foreground = false → tapping fires the action handler without
        // bringing the app to the foreground. Faster, less disruptive
        // for vendors mid-conversation.
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_REJECT,
        buttonTitle: "Reject",
        // Reject we DO open to foreground so the vendor can optionally
        // add a reason. The handler will navigate to the order detail
        // with a reject sheet pre-opened.
        options: { opensAppToForeground: true, isDestructive: true },
      },
    ]);
  } catch (err) {
    if (__DEV__) {
      console.warn("[push] Failed to register notification categories", err);
    }
  }
}

async function requestPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;

  const request = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return request.granted;
}

function getProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as any)?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  );
}

async function fetchExpoToken(): Promise<string | null> {
  const projectId = getProjectId();
  try {
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return tokenResponse?.data ?? null;
  } catch (err) {
    console.warn("[push] Failed to fetch Expo push token", err);
    return null;
  }
}

/**
 * Registers this device with the backend for the currently authenticated user.
 * Safe to call once on login and whenever auth state transitions.
 */
export async function registerDeviceForPush(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators/emulators don't get push tokens.
    return null;
  }

  try {
    await ensureAndroidChannels();

    const granted = await requestPermission();
    if (!granted) return null;

    const token = await fetchExpoToken();
    if (!token) return null;

    const platform: "ios" | "android" | "web" =
      Platform.OS === "ios"
        ? "ios"
        : Platform.OS === "android"
        ? "android"
        : "web";

    await registerPushToken({
      token,
      platform,
      appVersion: Constants.expoConfig?.version ?? undefined,
    });

    await AsyncStorage.setItem(STORED_TOKEN_KEY, token);
    return token;
  } catch (err) {
    console.warn("[push] registerDeviceForPush failed", err);
    return null;
  }
}

/**
 * Removes the device's push token from the backend. Call on logout.
 */
export async function unregisterDeviceFromPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(STORED_TOKEN_KEY);
    if (token) {
      await unregisterPushToken(token);
    }
  } catch (err) {
    console.warn("[push] unregisterDeviceFromPush failed", err);
  } finally {
    await AsyncStorage.removeItem(STORED_TOKEN_KEY);
  }
}

function handleTap(data: Record<string, any> | undefined) {
  if (!data || typeof data !== "object") return;

  // Refresh order-related caches BEFORE navigating so the destination
  // screen mounts against fresh data. Without this the vendor lands on
  // a stale list (60s staleTime) and the new order shows up a beat
  // later, which feels broken.
  if (typeof data.type === "string" && ORDER_RELEVANT_PUSH_TYPES.has(data.type)) {
    invalidateOrdersAndNotifications();
  }

  switch (data.type) {
    case "new_order":
      navigate("Orders" as any);
      break;
    case "manual_payment_confirm":
      // Tapping the body (not a button) of a manual-payment push opens
      // the orders list so the vendor can drill in and confirm/reject
      // from the in-app UI as well. The reference is preserved in the
      // route params for the orders screen to highlight the row.
      navigate("Orders" as any, { highlightReference: data.reference });
      break;
    case "subscription_expiry":
      navigate("SubscriptionBilling" as any);
      break;
    default:
      navigate("Notifications" as any);
      break;
  }
}

/**
 * Dispatches the chosen action from a manual-payment push to the
 * appropriate backend endpoint. Buttons are typed via the action
 * identifiers we registered with the notification category.
 *
 * For Confirm: fire-and-forget, since opensAppToForeground is false —
 * the vendor sees a system-level success/fail haptic.
 * For Reject:  navigate to OrderDetails so the vendor can attach a
 *              reason note before submitting.
 */
async function handleNotificationAction(
  actionId: string,
  data: Record<string, any> | undefined
) {
  if (!data || typeof data !== "object") return;
  const reference = typeof data.reference === "string" ? data.reference : null;
  if (!reference) {
    if (__DEV__) {
      console.warn("[push] manual-payment action fired without reference", data);
    }
    return;
  }

  if (actionId === ACTION_CONFIRM) {
    try {
      await confirmManualPayment(reference);
      if (__DEV__) console.log("[push] confirmed payment", reference);
      // Confirming flips the order from the unpaid bucket to the paid
      // bucket server-side. Invalidate so when the vendor next opens
      // the app the move is already reflected — without this they see
      // the order still sitting in pending for up to 60s.
      invalidateOrdersAndNotifications();
    } catch (err) {
      if (__DEV__) console.warn("[push] confirm payment failed", err);
      // The app is still backgrounded at this point — opening it would
      // be jarring. The next time the vendor opens the app the order
      // will still be in the inbox; they can retry from there.
    }
    return;
  }

  if (actionId === ACTION_REJECT) {
    // Foreground action — opens a dedicated modal screen where the
    // vendor can pick a reason and submit. The screen handles the API
    // call + toast + back-navigation itself.
    const orderTotal = typeof data.orderTotal === "number"
      ? data.orderTotal
      : Number(data.orderTotal) || undefined;
    const customerName = typeof data.customerName === "string" && data.customerName.length > 0
      ? data.customerName
      : undefined;
    navigate("RejectManualPayment" as any, {
      reference,
      customerName,
      orderTotal,
    });
  }
}

/**
 * Mounts foreground + tap listeners. Call once in App.tsx.
 * Token registration itself is triggered from AuthContext after login.
 */
export function usePushNotifications() {
  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    ensureAndroidChannels().catch(() => {});
    ensureNotificationCategories().catch(() => {});

    receivedSub.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log("[push] received", notification.request.content);
        }
        // Foreground arrival — vendor is in the app right now. Pre-warm
        // the orders cache so navigating to Orders (via the system
        // banner tap or in-app) shows the new row immediately, not on
        // the next 60s tick.
        const data = notification.request.content.data as
          | Record<string, any>
          | undefined;
        if (data && typeof data.type === "string" && ORDER_RELEVANT_PUSH_TYPES.has(data.type)) {
          invalidateOrdersAndNotifications();
        }
      }
    );

    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, any>
          | undefined;
        const actionId = response.actionIdentifier;

        // Default tap (body) — Expo uses a sentinel id for "user opened
        // the notification without picking an action button". Anything
        // else is one of our registered action identifiers.
        if (
          actionId === Notifications.DEFAULT_ACTION_IDENTIFIER ||
          !actionId
        ) {
          handleTap(data);
          return;
        }
        handleNotificationAction(actionId, data);
      }
    );

    // Handle the case where the app was launched from a notification (cold start).
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          const data = response.notification.request.content.data as
            | Record<string, any>
            | undefined;
          const actionId = response.actionIdentifier;
          if (
            actionId === Notifications.DEFAULT_ACTION_IDENTIFIER ||
            !actionId
          ) {
            handleTap(data);
          } else {
            handleNotificationAction(actionId, data);
          }
        }
      })
      .catch(() => {});

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);
}
