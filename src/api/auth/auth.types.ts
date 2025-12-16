export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    storeId: string;
  }
}

export interface SignupRequest {
    email: string;
    password: string;
    otp: string;
    skipVerificationForLater: boolean;
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
  role: number;
  userStatus: number;
}
