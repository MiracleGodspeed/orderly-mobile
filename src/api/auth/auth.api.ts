import { apiClient } from "../client";
import {
  LoginResponse,
  LoginRequest,
  SignupRequest,
  SignupResponseComplete,
  SignupResponseInitial,
  OtpVerificationRequest,
  Country,
  ChangePasswordRequest,
} from "./auth.types";

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

export const changePassword = async (
  payload: ChangePasswordRequest
): Promise<void> => {
  // Backend DTO shape (lowercase property names) — see ChangePasswordDto in
  // orderly.domain/DTOs/LoginDto.cs.
  const response = await apiClient.post<{ code: string; message: string }>(
    "/auth/update-password",
    {
      email: payload.email,
      currentpassword: payload.currentPassword,
      newpassword: payload.newPassword,
    },
    { validateStatus: () => true }
  );
  if (response.data?.code !== "200") {
    const detail =
      response.data?.message ||
      `HTTP ${response.status} ${response.statusText ?? ""}`.trim();
    throw new Error(detail || "Couldn't update password.");
  }
};

export const resendOtp = async (email: string): Promise<void> => {
  const response = await apiClient.post<{ code: string; message: string }>(
    "/auth/resend-otp",
    { Email: email },
    { validateStatus: () => true }
  );
  if (response.data?.code !== "200") {
    const detail =
      response.data?.message || `HTTP ${response.status} ${response.statusText ?? ""}`.trim();
    throw new Error(detail || "Couldn't resend the code.");
  }
};

export const getCountries = async (): Promise<Country[]> => {
  const response = await apiClient.get<{
    message: string;
    code: string;
    data: Country[];
  }>("/countries/get-all", { validateStatus: () => true });
  return handleApiResponse<Country[]>(response);
};

export const googleLogin = async (idToken: any): Promise<LoginResponse> => {
  const response = await apiClient.post<any>(
    "/auth/authenticate-with-google",
    idToken ,
    { validateStatus: () => true }
  );
  // console.log(response, "gooflerespoo")
  return handleApiResponse<LoginResponse>(response);
};