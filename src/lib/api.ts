// Frontend API Client for Backend REST & Sync Endpoints

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:4000/api'
  : '/api';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('kairo_auth_token');
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('kairo_auth_token', token);
  } else {
    localStorage.removeItem('kairo_auth_token');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data as T;
}

// Auth API Calls
export const authApi = {
  register: (payload: { email: string; password: string; firstName: string; lastName?: string; username?: string }) =>
    apiRequest<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
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
  getVapidPublicKey: () =>
    apiRequest<{ publicKey: string }>('/push/vapid-public-key'),

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
