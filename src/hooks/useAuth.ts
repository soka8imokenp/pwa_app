import { useState, useEffect, useCallback } from 'react';
import { authApi, setAuthToken, getAuthToken } from '../lib/api';
import { triggerTwoWaySync } from '../lib/syncEngine';

export interface AuthUserProfile {
  id?: string;
  email: string;
  firstName: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  themeAccent?: string;
  soundEnabled?: boolean;
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_auth_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate session on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      authApi
        .getProfile()
        .then((res) => {
          setCurrentUser(res.user);
          localStorage.setItem('kairo_auth_user', JSON.stringify(res.user));
          triggerTwoWaySync();
        })
        .catch(() => {
          // Token expired or invalid
          setAuthToken(null);
          localStorage.removeItem('kairo_auth_user');
          setCurrentUser(null);
        });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.login({ email, password });
      setAuthToken(result.token);
      setCurrentUser(result.user);
      localStorage.setItem('kairo_auth_user', JSON.stringify(result.user));
      await triggerTwoWaySync();
      return result.user;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    username?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.register(payload);
      setAuthToken(result.token);
      setCurrentUser(result.user);
      localStorage.setItem('kairo_auth_user', JSON.stringify(result.user));
      await triggerTwoWaySync();
      return result.user;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem('kairo_auth_user');
    setCurrentUser(null);
  }, []);

  return {
    currentUser,
    isLoading,
    error,
    login,
    register,
    logout,
  };
}
