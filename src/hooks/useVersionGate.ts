import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Application from "expo-application";
import { getVersionConfig, UpdateAction, VersionConfig } from "../api/app/app.api";

export interface VersionGateState {
  action: UpdateAction;
  storeUrl: string;
  message?: string | null;
  latestVersion: string;
  /** True until the first check resolves, so we don't flash a gate on launch. */
  checking: boolean;
}

const PLATFORM: "ios" | "android" = Platform.OS === "android" ? "android" : "ios";

/**
 * Force-update gate. On launch (and whenever the app returns to foreground)
 * it asks the backend whether this installed NATIVE build is too old.
 * Fails open — a network error never blocks the user.
 */
export function useVersionGate(): VersionGateState {
  const [state, setState] = useState<VersionGateState>({
    action: "none",
    storeUrl: "",
    latestVersion: "",
    checking: true,
  });

  useEffect(() => {
    let cancelled = false;

    // Never gate in development — a dev/Expo Go build's version string is
    // unreliable and could falsely trip the "hard" gate.
    if (__DEV__) {
      setState((s) => ({ ...s, checking: false }));
      return;
    }

    const check = async () => {
      const current = Application.nativeApplicationVersion ?? "0.0.0";
      const cfg: VersionConfig = await getVersionConfig(PLATFORM, current);
      if (cancelled) return;
      setState({
        action: cfg.action,
        storeUrl: cfg.storeUrl,
        message: cfg.message,
        latestVersion: cfg.latestVersion,
        checking: false,
      });
    };

    check();

    // Re-check when the app comes back to the foreground — catches the case
    // where you raise the minimum while a user has the app backgrounded.
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return state;
}
