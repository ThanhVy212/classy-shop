import React, { useEffect, useState, useCallback } from "react";
import type { AuthUser, AuthResponse } from "../types/auth";
import type { LoginFormData, RegisterFormData } from "../validations/auth";
import { authService } from "../services/authService";
import { setAccessToken } from "../services/api";
import { AuthContext } from "./auth-context";

const HAS_SESSION_KEY = "classyshop_has_session";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Attempt silent refresh via httpOnly cookie on mount to restore session in memory
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const hasSession = localStorage.getItem(HAS_SESSION_KEY) === "true";
      if (!hasSession) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const refreshRes = await authService.refreshToken();
        if (refreshRes?.accessToken) {
          setAccessToken(refreshRes.accessToken);
          if (isMounted) {
            setToken(refreshRes.accessToken);
          }
          const profile = await authService.getProfile();
          if (isMounted && profile?.user) {
            setUser(profile.user);
          }
        }
      } catch {
        // Not authenticated or refresh session expired
        localStorage.removeItem(HAS_SESSION_KEY);
        if (isMounted) {
          setAccessToken(null);
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (data: LoginFormData): Promise<AuthResponse> => {
    const response = await authService.login(data);
    if (response.token) {
      localStorage.setItem(HAS_SESSION_KEY, "true");
      setAccessToken(response.token);
      setToken(response.token);
    }
    if (response.user) {
      setUser(response.user);
    }
    return response;
  }, []);

  const register = useCallback(async (data: RegisterFormData): Promise<AuthResponse> => {
    const response = await authService.register(data);
    if (response.token) {
      localStorage.setItem(HAS_SESSION_KEY, "true");
      setAccessToken(response.token);
      setToken(response.token);
    }
    if (response.user) {
      setUser(response.user);
    }
    return response;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      localStorage.removeItem(HAS_SESSION_KEY);
      setAccessToken(null);
      setUser(null);
      setToken(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
