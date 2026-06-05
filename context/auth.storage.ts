import AsyncStorage from "@react-native-async-storage/async-storage";
import { reset } from '../src/navigation/NavigationService';

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const REFRESH_TOKEN_EXP_KEY = "auth_refresh_token_exp";

// Pure storage helper — no navigation. Routing is the caller's responsibility
// because the right destination depends on context (post-login vs. post-OTP
// vs. silent token refresh).
export const saveAuthToStorage = async (
  token?: string,
  user?: any,
  refreshToken?: string | null,
  refreshTokenExpiresAt?: string | Date | null
) => {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  if (user) {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  if (refreshTokenExpiresAt) {
    const iso = refreshTokenExpiresAt instanceof Date
      ? refreshTokenExpiresAt.toISOString()
      : refreshTokenExpiresAt;
    await AsyncStorage.setItem(REFRESH_TOKEN_EXP_KEY, iso);
  }
};

export const getAuthFromStorage = async () => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  const user = await AsyncStorage.getItem(AUTH_USER_KEY);
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  const refreshTokenExpiresAt = await AsyncStorage.getItem(REFRESH_TOKEN_EXP_KEY);

  return {
    token,
    user: user ? JSON.parse(user) : null,
    refreshToken,
    refreshTokenExpiresAt,
  };
};

// Standalone read for the axios interceptor — it only needs the
// refresh token, doesn't need user JSON.
export const getRefreshTokenFromStorage = async (): Promise<string | null> => {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
};

// Updates only the token pair after a successful /auth/refresh-token.
// Keeps the persisted user untouched.
export const saveRefreshedTokensToStorage = async (
  accessToken: string,
  refreshToken: string,
  refreshTokenExpiresAt?: string | Date | null
) => {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (refreshTokenExpiresAt) {
    const iso = refreshTokenExpiresAt instanceof Date
      ? refreshTokenExpiresAt.toISOString()
      : refreshTokenExpiresAt;
    await AsyncStorage.setItem(REFRESH_TOKEN_EXP_KEY, iso);
  }
};

export const IsLoggedIn = async () : Promise<boolean> => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  const user = await AsyncStorage.getItem(AUTH_USER_KEY);

  const parsedUser = user ? JSON.parse(user) : null;
  if (parsedUser != null && parsedUser.id != null) {
    return true;
  }
  return false;
};

// Every prefix here namespaces *user-scoped* data — anything that belongs
// to the vendor who's currently signed in and must NOT survive into a
// different account on the same device. Logout sweeps every key matching
// one of these, so adding a new per-user cache never reopens the "ghost
// data from the previous account" bug as long as it uses one of these
// prefixes (or you add its prefix here).
//
//   auth_                  → token / user / refresh-token set (auth.storage)
//   store_data_cache       → storefront snapshot (VendorContext)
//   store_setup_steps      → onboarding checklist progress (legacy)
//   vendor_                → vendor_auto_renew + any vendor-scoped flag
//   orderly:               → feature-gate + subscription-history caches
//   orderly.pushToken      → device push token mapped to this user
//   product_drafts         → in-progress product drafts (productDrafts)
//   trial_welcome_seen_    → per-store "seen the trial modal" flag
//
// NOTE: this is intentionally broad. There is currently no device-level
// preference that must persist across logout; if one is ever added, give
// it a prefix OUTSIDE this list.
const USER_SCOPED_KEY_PREFIXES = [
  "auth_",
  "store_data_cache",
  "store_setup_steps",
  "vendor_",
  "orderly:",
  "orderly.",
  "product_drafts",
  "trial_welcome_seen_",
];

export const clearAuthFromStorage = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = allKeys.filter((k) =>
      USER_SCOPED_KEY_PREFIXES.some((prefix) => k.startsWith(prefix))
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    // Never let a storage hiccup block the sign-out. Fall back to wiping
    // the load-bearing auth keys explicitly so the session is gone even
    // if the sweep above failed.
    console.error("clearAuthFromStorage sweep failed", e);
    await AsyncStorage.multiRemove([
      AUTH_TOKEN_KEY,
      AUTH_USER_KEY,
      REFRESH_TOKEN_KEY,
      REFRESH_TOKEN_EXP_KEY,
    ]).catch(() => {});
  }
  reset('Splash');
};
