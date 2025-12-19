import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

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

export const clearAuthFromStorage = async () => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(AUTH_USER_KEY);
};
