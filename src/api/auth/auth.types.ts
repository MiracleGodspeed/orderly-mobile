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
  role: number;
  userStatus: number;
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
  role: number;
  userStatus: number;
}
