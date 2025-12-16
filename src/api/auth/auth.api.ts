import { apiClient } from "../client";
import { LoginResponse, LoginRequest, SignupRequest, SignupResponseComplete, SignupResponseInitial, OtpVerificationRequest } from "./auth.types";

const handleApiResponse = <T>(response: { data: any }): T => {
  if (!response.data) {
    throw new Error("No data returned from API");
  }

  if (response.data.code !== "200") {
    throw new Error(response.data.message || "API call failed");
  }

  return response.data.data;
};

export const login = async (
  payload: LoginRequest
): Promise<LoginResponse> => {
  const transformedPayload = {
    username: payload.email,
    password: payload.password,
  };

  const response = await apiClient.post<LoginResponse>(
    "/auth/login", 
    transformedPayload, 
    { validateStatus: () => true }
  );
  
  return handleApiResponse<LoginResponse>(response);
};

export const signup = async (
  payload: SignupRequest
): Promise<SignupResponseInitial> => {
  const response = await apiClient.post<SignupResponseInitial>(
    "/auth/create-account", 
    payload, 
    { validateStatus: () => true }
  );
  return handleApiResponse<SignupResponseInitial>(response);
};

export const verifyOtp = async (
  payload: OtpVerificationRequest
): Promise<SignupResponseComplete> => {
  const response = await apiClient.post<SignupResponseComplete>(
    "/auth/validate-otp", 
    payload, 
    { validateStatus: () => true }
  );

 
  return handleApiResponse<SignupResponseComplete>(response);
};