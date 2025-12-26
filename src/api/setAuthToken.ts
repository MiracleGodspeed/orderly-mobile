import { clearAuthFromStorage } from "../../context/auth.storage";
import { apiClient } from "./client";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// Request Interceptor
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Handle 401s that are returned as successful responses due to validateStatus: () => true
    if (response.status === 401) {
       console.log("Intercepted 401 in success handler");
       if (response.config && !response.config.url?.includes('/login')) {
          clearAuthFromStorage();
       }
    }
    return response;
  },
  (error) => {
    console.log(error, "API Error");
    
    if (error.response && error.response.status === 401) {
       // Check if the 401 is NOT from the login endpoint to avoid loops
       // (Though login usually uses validateStatus: true, this is a safety net)
       if (error.config && !error.config.url?.includes('/login')) {
          clearAuthFromStorage();
       }
    }
    return Promise.reject(error);
  }
);
