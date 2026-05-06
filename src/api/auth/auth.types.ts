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
}

export interface ChangePasswordRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
}
