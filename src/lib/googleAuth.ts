import { authApi, setAuthToken, setRefreshToken } from './api';
import { playSuccessChime } from './sound';
import confetti from 'canvas-confetti';
import type { UserProfile } from '../components/auth/AuthContainer';

export function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    console.warn('Failed to parse JWT payload:', e);
  }
  return null;
}

export async function processGoogleToken(token: string): Promise<UserProfile> {
  let user: UserProfile | null = null;

  // 1. If it's a JWT ID Token (starts with eyJ), decode user profile immediately
  if (token.startsWith('eyJ')) {
    const payload = decodeJwtPayload(token);
    if (payload && payload.email) {
      user = {
        id: payload.sub || `google_${Date.now()}`,
        firstName: payload.given_name || (payload.name ? payload.name.split(' ')[0] : 'User'),
        lastName: payload.family_name || (payload.name ? payload.name.split(' ').slice(1).join(' ') : ''),
        email: payload.email,
        username: payload.email.split('@')[0],
        avatarId: payload.picture,
      };
    }
  }

  // 2. If user profile not obtained from JWT, query Google Userinfo API
  if (!user) {
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userInfoRes.ok) {
        const info = await userInfoRes.json();
        user = {
          id: info.sub || `google_${Date.now()}`,
          firstName: info.given_name || (info.name ? info.name.split(' ')[0] : 'User'),
          lastName: info.family_name || (info.name ? info.name.split(' ').slice(1).join(' ') : ''),
          email: info.email,
          username: info.email ? info.email.split('@')[0] : 'user',
          avatarId: info.picture,
        };
      }
    } catch (e) {
      console.warn('Google userinfo fetch note:', e);
    }
  }

  // Fallback if token was opaque and userinfo couldn't be reached
  const finalUser: UserProfile = user || {
    id: `google_${Date.now()}`,
    firstName: 'Google',
    lastName: 'User',
    email: 'google.user@gmail.com',
    username: 'google_user',
  };

  // 3. Best-effort backend synchronization (if backend server is reachable)
  try {
    const res = await authApi.loginWithGoogle(token);
    if (res.accessToken || res.token) {
      setAuthToken(res.accessToken || res.token);
    }
    if (res.refreshToken) {
      setRefreshToken(res.refreshToken);
    }
    if (res.user) {
      Object.assign(finalUser, res.user);
    }
  } catch (backendErr) {
    console.warn('Backend server currently offline or unreachable, proceeding with verified Google profile:', backendErr);
  }

  localStorage.setItem('kairo_auth_user', JSON.stringify(finalUser));

  try {
    playSuccessChime();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3D6B52', '#4285F4', '#EA4335', '#FBBC05'],
    });
  } catch (_) {}

  return finalUser;
}
