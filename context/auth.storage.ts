import AsyncStorage from "@react-native-async-storage/async-storage";
import { reset } from '../src/navigation/NavigationService';

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

// Pure storage helper — no navigation. Routing is the caller's responsibility
// because the right destination depends on context (post-login vs. post-OTP
// vs. silent token refresh).
export const saveAuthToStorage = async (
  token?: string,
  user?: any
) => {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  if (user) {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
};

export const getAuthFromStorage = async () => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  const user = await AsyncStorage.getItem(AUTH_USER_KEY);

  return {
    token,
    user: user ? JSON.parse(user) : null,
  };
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
