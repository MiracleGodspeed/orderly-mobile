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
import { navigate } from "../navigation/NavigationService";

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

  switch (data.type) {
    case "new_order":
      navigate("Orders" as any);
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
 * Mounts foreground + tap listeners. Call once in App.tsx.
 * Token registration itself is triggered from AuthContext after login.
 */
export function usePushNotifications() {
  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    ensureAndroidChannels().catch(() => {});

    receivedSub.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Hook up any in-app toast / badge refresh logic here.
        if (__DEV__) {
          console.log("[push] received", notification.request.content);
        }
      }
    );

    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, any>
          | undefined;
        handleTap(data);
      }
    );

    // Handle the case where the app was launched from a notification (cold start).
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          const data = response.notification.request.content.data as
            | Record<string, any>
            | undefined;
          handleTap(data);
        }
      })
      .catch(() => {});

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);
}
