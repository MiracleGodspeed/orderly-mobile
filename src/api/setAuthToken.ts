import {
  clearAuthFromStorage,
  getRefreshTokenFromStorage,
  saveRefreshedTokensToStorage,
} from "../../context/auth.storage";
import { apiClient } from "./client";
import { refreshAccessToken } from "./auth/auth.api";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// Read the current access token — used to authenticate report downloads
// that are opened in the device browser (which can't set an Authorization
// header). The backend accepts `?access_token=` for /insights/report only.
export const getAuthToken = (): string | null => authToken;

// AuthContext registers a callback here so it can flush React state
// (setUser(null) / setToken(null) / queryClient.clear()) when the
// interceptor force-signs-out a refresh-failed session. Without this
// the storage clears but the UI keeps showing the logged-in screen
// until next mount.
let onForcedSignOut: (() => void) | null = null;
export const registerForcedSignOutCallback = (cb: (() => void) | null) => {
  onForcedSignOut = cb;
};

// Request Interceptor — attach Bearer access token.
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Single in-flight refresh shared across concurrent 401s — without
// this guard, ten parallel 401s would fire ten /auth/refresh-token
// calls, only the first of which would succeed (the others would
// see their rotated token revoked, trigger reuse-detection, and
// kick the user out).
let refreshInFlight: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const stored = await getRefreshTokenFromStorage();
      if (!stored) return null;
      const result = await refreshAccessToken(stored);
      await saveRefreshedTokensToStorage(
        result.accessToken,
        result.refreshToken,
        result.refreshTokenExpiresAt
      );
      setAuthToken(result.accessToken);
      return result.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
};

// Returns true when we should NOT attempt to refresh — login, the
// refresh call itself, logout, or a request that's already been
// retried once (avoid infinite loops).
const shouldSkipRefresh = (config: any): boolean => {
  if (!config) return true;
  if (config._skipAuthRefresh) return true;
  if (config._authRetried) return true;
  const url: string = config.url ?? "";
  return (
    url.includes("/login") ||
    url.includes("/refresh-token") ||
    url.includes("/logout") ||
    url.includes("/authenticate-with-google") ||
    url.includes("/authenticate-with-apple") ||
    url.includes("/create-account") ||
    url.includes("/validate-otp")
  );
};

const forceSignOut = () => {
  // No active session → nothing to tear down, and crucially nothing to
  // navigate away from. A 401 while logged out comes from a pre-auth
  // endpoint (a wrong password on /login, a bad/expired code on
  // /validate-otp) or from a stray authed request that shouldn't have
  // fired pre-login. In every one of those cases `clearAuthFromStorage`
  // would call `reset('Splash')` and yank the user — mid-onboarding,
  // mid-OTP — back to the splash screen. Skip it: let the caller surface
  // the error inline instead.
  if (!authToken) return;

  try {
    onForcedSignOut?.();
  } catch {
    // ignore — the storage clear below is the load-bearing step
  }
  clearAuthFromStorage();
};

const retryWithFreshToken = (config: any, newToken: string) => {
  config._authRetried = true;
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${newToken}`;
  return apiClient.request(config);
};

// Response Interceptor — refresh-and-retry on 401, force logout
// only when refresh itself fails.
apiClient.interceptors.response.use(
  async (response) => {
    // 401s arrive here when the caller passed `validateStatus: () => true`.
    if (response.status === 401) {
      if (shouldSkipRefresh(response.config)) {
        forceSignOut();
        return response;
      }
      const newToken = await performRefresh();
      if (!newToken) {
        forceSignOut();
        return response;
      }
      return retryWithFreshToken(response.config, newToken);
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      if (shouldSkipRefresh(error.config)) {
        forceSignOut();
        return Promise.reject(error);
      }
      const newToken = await performRefresh();
      if (!newToken) {
        forceSignOut();
        return Promise.reject(error);
      }
      return retryWithFreshToken(error.config, newToken);
    }
    return Promise.reject(error);
  }
);
