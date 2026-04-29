import { apiClient } from "../client";

export interface RegisterPushTokenPayload {
  token: string;
  platform: "ios" | "android" | "web";
  deviceId?: string;
  appVersion?: string;
}

export const registerPushToken = async (
  payload: RegisterPushTokenPayload
): Promise<void> => {
  await apiClient.post("/push-notifications/register", payload, {
    validateStatus: () => true,
  });
};

export const unregisterPushToken = async (token: string): Promise<void> => {
  await apiClient.post(
    "/push-notifications/unregister",
    { token },
    { validateStatus: () => true }
  );
};
