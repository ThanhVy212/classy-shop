export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  googleId?: string | null;
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
