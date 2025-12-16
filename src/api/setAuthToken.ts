import { apiClient } from "./client";


let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});
