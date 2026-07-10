import { apiClient } from "../client";
import {
  LoginResponse,
  LoginRequest,
  SignupRequest,
  SignupResponseComplete,
  SignupResponseInitial,
  CreateAccountResult,
  OtpVerificationRequest,
  Country,
  ChangePasswordRequest,
  RefreshTokenResponse,
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
): Promise<CreateAccountResult> => {
  const response = await apiClient.post<SignupResponseInitial>(
    "/auth/create-account",
    payload,
    { validateStatus: () => true }
  );
  // `handleApiResponse` returns the envelope's inner `data`, which is the
  // CreateAccountResult DTO (otpSent + resumeStage). A completed account
  // comes back as a non-200 envelope and throws here, as before.
  return handleApiResponse<CreateAccountResult>(response);
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

export const deleteAccount = async (): Promise<void> => {
  const response = await apiClient.post<{ code: string; message: string }>(
    "/auth/delete-account",
    {},
    { validateStatus: () => true }
  );
  if (response.data?.code !== "200") {
    const detail =
      response.data?.message ||
      `HTTP ${response.status} ${response.statusText ?? ""}`.trim();
    throw new Error(detail || "Couldn't delete your account.");
  }
};

// Asks the backend for a short-lived (~5 min) JWT scoped to the
// currently authenticated vendor. Used by the iOS app to hand the
// session off to the web billing dashboard via a URL parameter,
// because Apple App Store guideline 3.1.3 forbids in-app subscription
// purchase outside of IAP — vendors must subscribe / renew on web.
export const issueWebHandoffToken = async (): Promise<string> => {
  const response = await apiClient.post<{
    code: string;
    message: string;
    data?: { token?: string };
  }>(
    "/auth/issue-web-handoff-token",
    {},
    { validateStatus: () => true }
  );
  if (response.data?.code !== "200" || !response.data?.data?.token) {
    const detail =
      response.data?.message ||
      `HTTP ${response.status} ${response.statusText ?? ""}`.trim();
    throw new Error(detail || "Couldn't open the billing page.");
  }
  return response.data.data.token;
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

// Mirrors AppleLoginDto on the backend. idToken is Apple's signed
// identity token; email and fullName are only present on the very
// first sign-in (Apple drops them on subsequent ones), and the
// backend matches on the verified `sub` claim either way.
export interface AppleLoginPayload {
  idToken: string;
  email?: string | null;
  FullName?: string | null;
  role: number;
  ReferralCode?: string;
}

export const appleLogin = async (
  payload: AppleLoginPayload
): Promise<LoginResponse> => {
  const response = await apiClient.post<any>(
    "/auth/authenticate-with-apple",
    payload,
    { validateStatus: () => true }
  );
  return handleApiResponse<LoginResponse>(response);
};

// Exchange a refresh token for a fresh access+refresh pair. The
// axios interceptor (src/api/client.ts) calls this on 401 and
// retries the original request transparently.
export const refreshAccessToken = async (
  refreshToken: string
): Promise<RefreshTokenResponse> => {
  const response = await apiClient.post<any>(
    "/auth/refresh-token",
    { refreshToken },
    { validateStatus: () => true, _skipAuthRefresh: true } as any
  );
  return handleApiResponse<RefreshTokenResponse>(response);
};

// Server-side logout. Best-effort — the mobile app should clear
// local state regardless of whether the server call succeeds, so
// we swallow errors here.
export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    await apiClient.post(
      "/auth/logout",
      { refreshToken },
      { validateStatus: () => true, _skipAuthRefresh: true } as any
    );
  } catch {
    // intentionally swallowed — logout is fire-and-forget
  }
};