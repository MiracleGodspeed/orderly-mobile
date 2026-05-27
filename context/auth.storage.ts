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

export const clearAuthFromStorage = async () => {
  await AsyncStorage.multiRemove([
    AUTH_TOKEN_KEY,
    AUTH_USER_KEY,
    REFRESH_TOKEN_KEY,
    REFRESH_TOKEN_EXP_KEY,
    "store_data_cache",
    "store_setup_steps",
    "vendor_auto_renew",
    // Persisted feature gate snapshot (see useFeatures). Drops out so a
    // different vendor signing in on the same device doesn't see the
    // previous user's plan permissions on first paint.
    "orderly:features-cache:v1",
  ]);
  reset('Splash');
};
