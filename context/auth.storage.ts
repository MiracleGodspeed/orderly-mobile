import AsyncStorage from "@react-native-async-storage/async-storage";
import { navigate } from '../src/navigation/NavigationService';

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export const saveAuthToStorage = async (
  token?: string,
  user?: any
) => {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  console.log(user, "user_storage")
  console.log(user?.userStatus, "userStatus")
  if (user) {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
  if (user && user?.userStatus == 2) {
    navigate('SetupStep1')
  } else {
    navigate('Home')
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
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(AUTH_USER_KEY);
  navigate('AuthOptions')
};
