export type UserRole = "admin" | "customer";

export interface ShippingAddress {
  _id: string;
  label?: string;
  fullName: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  googleId?: string | null;
  isEmailVerified?: boolean;
  addresses?: ShippingAddress[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message?: string;
  token: string;
  user: AuthUser;
}

export interface ProfileResponse {
  user: AuthUser;
}
