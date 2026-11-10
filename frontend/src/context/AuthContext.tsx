import React, { useEffect, useState, useCallback } from "react";
import type { AuthUser, AuthResponse } from "../types/auth";
import type { LoginFormData, RegisterFormData } from "../validations/auth";
import { authService } from "../services/authService";
import {
  isDefinitiveAuthError,
  setAccessToken,
  setAuthFailureHandler,
} from "../services/api";
import { AuthContext } from "./auth-context";

const HAS_SESSION_KEY = "classyshop_has_session";

// A cold backend (or a short network blip) should not log the user out. The
// first attempts are cheap because a failed connection never reaches the
// refresh endpoint, so it does not consume the refresh rate-limit quota.
const RESTORE_ATTEMPTS = 3;
const RESTORE_RETRY_DELAY_MS = 800;

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Attempt silent refresh via httpOnly cookie on mount to restore session in memory
  useEffect(() => {
    let isMounted = true;

    // Keep React state in sync if axios later discovers the refresh session
    // is really gone (e.g. an expired access token triggers a refresh that
    // returns 401/403).
    setAuthFailureHandler(() => {
      localStorage.removeItem(HAS_SESSION_KEY);
      setAccessToken(null);
      setUser(null);
      setToken(null);
    });

    const restoreSession = async () => {
      const hasSession = localStorage.getItem(HAS_SESSION_KEY) === "true";
      if (!hasSession) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      let lastError: unknown = null;

      for (let attempt = 0; attempt < RESTORE_ATTEMPTS; attempt += 1) {
        try {
          const refreshRes = await authService.refreshToken();
          if (!refreshRes?.accessToken) {
            throw new Error("Unable to restore your session.");
          }

          setAccessToken(refreshRes.accessToken);
          if (isMounted) {
            setToken(refreshRes.accessToken);
          }

          const profile = await authService.getProfile();
          if (isMounted && profile?.user) {
            setUser(profile.user);
          }

          lastError = null;
          break;
        } catch (error) {
          lastError = error;

          // 401/403 is a real answer: the refresh session is gone. Retrying
          // cannot help, so stop immediately.
          if (isDefinitiveAuthError(error)) {
            break;
          }

          if (attempt < RESTORE_ATTEMPTS - 1) {
            await wait(RESTORE_RETRY_DELAY_MS * (attempt + 1));
          }
        }
      }

      if (lastError && isDefinitiveAuthError(lastError)) {
        localStorage.removeItem(HAS_SESSION_KEY);
        if (isMounted) {
          setAccessToken(null);
          setUser(null);
          setToken(null);
        }
      }
      // On a transient failure we deliberately keep HAS_SESSION_KEY. The UI
      // may render as a guest for this load, but the next request or reload
      // can restore the session instead of permanently logging the user out.

      if (isMounted) {
        setIsLoading(false);
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
      setAuthFailureHandler(null);
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

    const completeOAuthLogin = useCallback(async (tokenFromUrl?: string | null): Promise<AuthUser> => {
    let activeToken = tokenFromUrl;

    if (!activeToken) {
      const refreshRes = await authService.refreshToken();
      if (!refreshRes?.accessToken) {
        throw new Error("Unable to restore your session.");
      }
      activeToken = refreshRes.accessToken;
    }

    setAccessToken(activeToken);
    setToken(activeToken);

    const profile = await authService.getProfile();
    if (!profile?.user) {
      throw new Error("Unable to load your profile.");
    }

    localStorage.setItem(HAS_SESSION_KEY, "true");
    setUser(profile.user);

    return profile.user;
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
        isAdmin: user?.role === "admin",
        isLoading,
        login,
        register,
        completeOAuthLogin,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
