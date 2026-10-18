import { createContext } from "react";
import type { AuthUser, AuthResponse } from "../types/auth";
import type { LoginFormData, RegisterFormData } from "../validations/auth";

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginFormData) => Promise<AuthResponse>;
  register: (data: RegisterFormData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
