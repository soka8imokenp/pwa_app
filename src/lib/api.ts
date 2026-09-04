// Frontend API Client for Backend REST & Sync Endpoints
// Features: Silent Refresh Token Rotation, JWT Expiration Check, Proactive Auth, and Exponential Backoff Retry

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '/api';
  const custom = localStorage.getItem('kairo_server_url');
  if (custom) return custom.replace(/\/$/, '') + '/api';
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return '/api';
}

const API_BASE_URL = getApiBaseUrl();

const AUTH_TOKEN_KEY = 'kairo_auth_token';
const REFRESH_TOKEN_KEY = 'kairo_refresh_token';
const AUTH_USER_KEY = 'kairo_auth_user';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(refreshToken: string | null) {
  if (typeof window === 'undefined') return;
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearAuthTokens() {
  setAuthToken(null);
  setRefreshToken(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

/**
 * Checks if a JWT token is expired or close to expiring (buffer of 60 seconds)
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded.exp) return false;
    const expiryMs = decoded.exp * 1000;
    return Date.now() >= expiryMs - 60000; // Proactively treat as expired 60s before actual expiry
  } catch {
    return true;
  }
}

// Single in-flight refresh promise to prevent duplicate concurrent refresh requests
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAuthSession(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuthTokens();
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.accessToken || data.token;
      const newRefreshToken = data.refreshToken;

      if (newAccessToken) {
        setAuthToken(newAccessToken);
      }
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }
      if (data.user && typeof window !== 'undefined') {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      }

      return newAccessToken || null;
    } catch (err) {
      console.warn('Silent refresh failed:', err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export interface ApiRequestOptions extends RequestInit {
  retries?: number;
  skipAuthRefresh?: boolean;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { retries = 2, skipAuthRefresh = false, ...fetchOptions } = options;

  let token = getAuthToken();

  // Proactive token refresh if access token is expired but refresh token exists
  if (!skipAuthRefresh && isTokenExpired(token) && getRefreshToken() && !endpoint.includes('/auth/')) {
    const refreshedToken = await refreshAuthSession();
    if (refreshedToken) {
      token = refreshedToken;
    }
  }

  const headers = new Headers(fetchOptions.headers || {});

  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retries) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 Unauthorized by trying a silent token refresh once
      if (response.status === 401 && !skipAuthRefresh && !endpoint.includes('/auth/')) {
        const refreshedToken = await refreshAuthSession();
        if (refreshedToken) {
          headers.set('Authorization', `Bearer ${refreshedToken}`);
          // Retry the original request with the fresh token
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...fetchOptions,
            headers,
          });
          const retryData = await retryResponse.json().catch(() => ({}));
          if (!retryResponse.ok) {
            throw new Error(retryData.error || `HTTP error ${retryResponse.status}`);
          }
          return retryData as T;
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data as T;
    } catch (err: any) {
      lastError = err;
      attempt++;

      // Don't retry on client errors (4xx) except temporary rate-limiting or network breaks
      if (err.message && err.message.includes('HTTP error 4')) {
        break;
      }

      if (attempt <= retries) {
        // Exponential backoff: 400ms, 800ms...
        const delay = Math.pow(2, attempt) * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`Request to ${endpoint} failed after ${retries} attempts.`);
}

// Auth API Calls
export const authApi = {
  register: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    username?: string;
  }) =>
    apiRequest<{ user: any; token: string; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuthRefresh: true,
    }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<{ user: any; token: string; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuthRefresh: true,
    }),

  loginWithGoogle: (idToken: string) =>
    apiRequest<{ user: any; token: string; accessToken: string; refreshToken: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      skipAuthRefresh: true,
    }),

  refreshToken: (refreshToken: string) =>
    apiRequest<{ user: any; token: string; accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuthRefresh: true,
    }),

  logout: (refreshToken?: string) =>
    apiRequest<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuthRefresh: true,
    }),

  getProfile: () =>
    apiRequest<{ user: any }>('/auth/me', {
      method: 'GET',
    }),
};

// Sync API Calls
export const syncApi = {
  push: (payload: any) =>
    apiRequest<{ success: boolean; serverTimestamp: number }>('/sync/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  pull: (sinceTimestamp?: number) =>
    apiRequest<{
      tasks: any[];
      habits: any[];
      habitLogs?: any[];
      focusSessions: any[];
      links: any[];
      healthProfile?: any;
      weightLogs?: any[];
      mealLogs?: any[];
      waterLogs?: any[];
      workoutLogs?: any[];
      serverTimestamp: number;
    }>(`/sync/pull${sinceTimestamp ? `?since=${sinceTimestamp}` : ''}`, {
      method: 'GET',
    }),
};

// Push API Calls
export const pushApi = {
  getVapidPublicKey: () => apiRequest<{ publicKey: string }>('/push/vapid-public-key'),

  subscribe: (subscription: PushSubscriptionJSON) =>
    apiRequest<{ success: boolean }>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),

  sendTest: (title?: string, body?: string) =>
    apiRequest<{ success: boolean }>('/push/test', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    }),
};
