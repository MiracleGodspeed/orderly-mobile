import { apiClient } from "../client";

export type UpdateAction = "hard" | "soft" | "none";

export interface VersionConfig {
  minSupportedVersion: string;
  latestVersion: string;
  storeUrl: string;
  action: UpdateAction;
  message?: string | null;
}

/**
 * Asks the backend whether this installed build needs updating.
 * `currentVersion` is the NATIVE binary version (from expo-application), not
 * the JS/OTA version — the gate decides whether a *store* update is required.
 * Fails soft: any error returns action "none" so we never block on a hiccup.
 */
export const getVersionConfig = async (
  platform: "ios" | "android",
  currentVersion: string
): Promise<VersionConfig> => {
  try {
    const res = await apiClient.get("/app/version-config", {
      params: { platform, currentVersion },
      validateStatus: () => true,
      timeout: 8000,
    });
    const data = res?.data?.data;
    if (data && typeof data.action === "string") return data as VersionConfig;
  } catch {
    // swallow — fail open
  }
  return {
    minSupportedVersion: currentVersion,
    latestVersion: currentVersion,
    storeUrl: "",
    action: "none",
  };
};
