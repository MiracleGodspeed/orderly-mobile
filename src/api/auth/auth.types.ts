export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  fullName: string | null;
  storeId: string;
  storeName: string;
  storeSlug: string;
  // JsonStringEnumConverter ships these as enum names on the wire now;
  // older builds emitted the integer. Compare via isRole / isUserStatus
  // in src/lib/authStatus rather than strict-equality to handle both.
  role: number | string;
  userStatus: number | string;
  // Optional — older backend builds don't ship a refresh token. Once
  // the new backend is deployed every login response carries both.
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
}

// Server payload from POST /api/auth/refresh-token.
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}


export interface SignupRequest {
    email: string;
    password: string;
    otp: string;
    skipVerificationForLater: boolean;
    countryCode?: string;
    phone?: string;
    referralCode?: string;
}

export interface Country {
    id: number;
    name: string;
    flag?: string | null;
    code: string;
    enabled?: boolean;
}

export interface GetCountriesResponse {
    message: string;
    code: string;
    data: Country[];
}

export interface SignupResponseInitial {
    message: string;
    code: string;
    data: boolean;
}

/**
 * Inner `data` of a create-account response. `resumeStage` is null for a
 * brand-new signup; "otp" when the email already has an unverified account
 * (a fresh code was just emailed); "setup" when the email is verified but
 * the store was never finished (resume by signing in).
 */
export interface CreateAccountResult {
    otpSent: boolean;
    resumeStage: "otp" | "setup" | null;
}

export interface OtpVerificationRequest {
  email: string;
  password: string;
  otp: string; 
  skipVerificationForLater: boolean; 
}



export interface SignupResponseComplete {
  token: string;
  userId: string;
  fullName?: string | null;
  storeName?: string | null;
  storeSlug?: string | null;
  storeId?: string | null;
  phoneNumber?: string | null;
  email: string;
  role: number | string;
  userStatus: number | string;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
}

export interface ChangePasswordRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
}
