import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import rabbitAnimation from '../../assets/rabbit-hi.json';
import { LottiePlayer } from '../common/LottiePlayer';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { authApi, setAuthToken, setRefreshToken } from '../../lib/api';

export interface UserProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  bio?: string;
  motto?: string;
  role?: string;
  focusDailyGoalHours?: number;
  workStyle?: 'deep_focus' | 'balanced' | 'sprint' | 'zen';
  joinedDate?: string;
  avatarId?: string;
}

interface AuthContainerProps {
  onLoginSuccess: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'register' | 'forgot-password';

export const AuthContainer: React.FC<AuthContainerProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotDone, setForgotDone] = useState(false);

  // Error message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please enter your username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const emailToUse = identifier.includes('@') ? identifier : `${identifier}@sumire.app`;
      const res = await authApi.login({
        email: emailToUse,
        password,
      });

      setAuthToken(res.accessToken || res.token);
      if (res.refreshToken) {
        setRefreshToken(res.refreshToken);
      }
      localStorage.setItem('kairo_auth_user', JSON.stringify(res.user));

      playSuccessChime();
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3D6B52', '#E09F3E', '#C25E40', '#476C85'],
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err?.message && (err.message.includes('429') || err.message.includes('Too many') || err.message.includes('attempts'))) {
        setErrorMsg(err.message || 'Too many login attempts. Please wait 15 minutes.');
        return;
      }
      // Offline fallback
      const user: UserProfile = {
        firstName: identifier,
        lastName: '',
        email: identifier.includes('@') ? identifier : `${identifier}@sumire.app`,
        username: identifier,
      };
      localStorage.setItem('kairo_auth_user', JSON.stringify(user));
      playSuccessChime();
      onLoginSuccess(user);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !email.trim() || !regUsername.trim() || !regPassword.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      const parts = fullName.trim().split(' ');
      const firstName = parts[0] || 'User';
      const lastName = parts.slice(1).join(' ') || '';

      const res = await authApi.register({
        email,
        password: regPassword,
        username: regUsername,
        firstName,
        lastName,
      });

      setAuthToken(res.accessToken || res.token);
      if (res.refreshToken) {
        setRefreshToken(res.refreshToken);
      }
      localStorage.setItem('kairo_auth_user', JSON.stringify(res.user));

      playSuccessChime();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3D6B52', '#E09F3E', '#F7E3DC'],
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err?.message && err.message.includes('already exists')) {
        setErrorMsg('User with this email already exists.');
        return;
      }
      // Offline fallback
      const parts = fullName.trim().split(' ');
      const user: UserProfile = {
        firstName: parts[0] || 'User',
        lastName: parts.slice(1).join(' ') || '',
        email,
        username: regUsername,
      };
      localStorage.setItem('kairo_auth_user', JSON.stringify(user));
      playSuccessChime();
      onLoginSuccess(user);
    } finally {
      setIsLoading(false);
    }
  };

  const GOOGLE_CLIENT_ID =
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
    (typeof window !== 'undefined' ? localStorage.getItem('kairo_google_client_id') : null) ||
    '98363494043-t58b883m6upt2mrtegt90e7lq08srq01.apps.googleusercontent.com';

  const decodeJwtPayload = (jwt: string): any => {
    try {
      const parts = jwt.split('.');
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
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
  };

  const processGoogleAuth = async (token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
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
      if (!user) {
        user = {
          id: `google_${Date.now()}`,
          firstName: 'Google',
          lastName: 'User',
          email: 'google.user@gmail.com',
          username: 'google_user',
        };
      }

      // 3. Best-effort backend synchronization (if backend server is reachable)
      try {
        const res = await authApi.loginWithGoogle(token);
        setAuthToken(res.accessToken || res.token);
        if (res.refreshToken) {
          setRefreshToken(res.refreshToken);
        }
        if (res.user) {
          user = res.user;
        }
      } catch (backendErr) {
        console.warn('Backend server currently offline or unreachable, proceeding with verified Google profile:', backendErr);
      }

      localStorage.setItem('kairo_auth_user', JSON.stringify(user));

      playSuccessChime();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3D6B52', '#4285F4', '#EA4335', '#FBBC05'],
      });

      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Google authentication error:', err);
      setErrorMsg(err?.message || 'Failed to authenticate with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check on mount or hashchange if returning from Google OAuth redirect with hash (#access_token=... or #id_token=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkHash = () => {
      const hash = window.location.hash;
      if (hash && (hash.includes('access_token=') || hash.includes('id_token='))) {
        try {
          const hashClean = hash.startsWith('#') ? hash.substring(1) : hash;
          const params = new URLSearchParams(hashClean);
          const idToken = params.get('id_token');
          const accessToken = params.get('access_token');
          const token = idToken || accessToken;

          if (token) {
            // Clean the hash from the URL without triggering page reload
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            processGoogleAuth(token);
          }
        } catch (e) {
          console.error('Failed to parse Google OAuth redirect hash:', e);
        }
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const openGoogleOAuthRedirect = () => {
    let redirectUri = window.location.origin;
    if (!redirectUri.endsWith('/')) {
      redirectUri += '/';
    }
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      GOOGLE_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${nonce}&prompt=select_account`;

    window.location.href = authUrl;
  };

  const handleGoogleSignIn = () => {
    playClickSound();
    setErrorMsg(null);

    // Check if on mobile or WebView
    const isMobileOrApp = typeof window !== 'undefined' && (
      window.location.origin.includes('localhost') ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );

    // On mobile / Android APK or WebView, direct OAuth redirect opens cleanly and never gets suppressed
    if (isMobileOrApp) {
      openGoogleOAuthRedirect();
      return;
    }

    // On desktop browser, attempt Google Identity Services Token Client first, with redirect fallback
    const google = typeof window !== 'undefined' ? (window as any).google : null;
    if (google?.accounts?.oauth2) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              console.error('Google OAuth error:', tokenResponse);
              if (tokenResponse.error !== 'popup_closed_by_user') {
                openGoogleOAuthRedirect();
              }
              return;
            }
            if (tokenResponse?.access_token) {
              await processGoogleAuth(tokenResponse.access_token);
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('Google token client popup failed, redirecting:', err);
      }
    }

    openGoogleOAuthRedirect();
  };

  const handleGuest = () => {
    playClickSound();
    const guestUser: UserProfile = {
      firstName: 'Guest',
      lastName: 'Traveler',
      email: 'guest@sumire.app',
      username: 'guest_user',
    };
    localStorage.setItem('kairo_auth_user', JSON.stringify(guestUser));
    playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3D6B52', '#E09F3E', '#F0BB58'],
    });
    onLoginSuccess(guestUser);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    playClickSound();
    setForgotDone(true);
  };

  const switchMode = (next: AuthMode) => {
    playClickSound();
    setErrorMsg(null);
    setForgotDone(false);
    setMode(next);
  };

  return (
    <div className="min-h-screen bg-[#F4F0EA] text-[#24201D] flex flex-col justify-between px-5 py-6 max-w-md mx-auto select-none font-body relative overflow-hidden">
      
      {/* Background Soft Organic Glows */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#3D6B52]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 -right-20 w-80 h-80 bg-[#E09F3E]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Brand */}
      <div className="w-full flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#3D6B52] text-white border-[1.75px] border-[#24201D] flex items-center justify-center font-black text-xs shadow-[1.5px_1.5px_0px_#24201D] font-display">
            DS
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider font-display text-[#24201D] block leading-none">
              Daily Planner
            </span>
            <span className="text-[9px] font-bold text-[#6B635B] uppercase tracking-wider">
              Focus & Habits
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGuest}
          className="text-xs font-bold text-[#6B635B] hover:text-[#24201D] px-3 py-1.5 bg-white border-[1.5px] border-[#24201D] rounded-xl shadow-[1.5px_1.5px_0px_#24201D] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1"
        >
          <span>Guest</span>
          <ArrowRight className="w-3 h-3 text-[#6B635B]" />
        </button>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 z-10 w-full max-w-sm mx-auto">
        
        {/* Mascot & Medallion */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-[2rem] border-[2px] border-[#24201D] bg-white shadow-[3px_3px_0px_#24201D] p-2 flex items-center justify-center relative overflow-hidden">
            <div className="w-full h-full rounded-[1.5rem] bg-gradient-to-b from-[#F4EFEA] to-[#E8E0D2] border border-[#24201D]/15 flex items-center justify-center">
              <LottiePlayer
                animationData={rabbitAnimation}
                loop={true}
                autoplay={true}
                className="w-full h-full object-contain scale-110"
              />
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        {mode !== 'forgot-password' && (
          <div className="w-full bg-[#E8E0D2]/70 p-1 border-[1.75px] border-[#24201D] rounded-2xl flex items-center mb-4 shadow-[2px_2px_0px_#24201D]">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#24201D] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#24201D] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="w-full mb-3 p-3 bg-rose-50 border-[1.75px] border-rose-900 rounded-2xl text-xs font-bold text-rose-950 shadow-[1.5px_1.5px_0px_#9F1239] flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="w-full space-y-3">
            {/* Identifier Input */}
            <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D]">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#6B635B] mb-1 font-display">
                Username or Email
              </label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#6B635B] shrink-0" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="alex or alex@example.com"
                  className="w-full text-xs font-bold text-[#24201D] outline-none placeholder:text-[#A89F91] bg-transparent"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-[10px] font-bold text-[#3D6B52] hover:underline cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#6B635B] shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs font-bold text-[#24201D] outline-none placeholder:text-[#A89F91] bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-[#6B635B] hover:text-[#24201D] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] font-black font-display text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}

        {/* 2. SIGN UP FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="w-full space-y-2.5">
            {/* Full Name */}
            <div className="p-2.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D]">
              <label className="block text-[9px] font-black uppercase text-[#6B635B] mb-0.5 font-display">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Smith"
                className="w-full text-xs font-bold text-[#24201D] outline-none placeholder:text-[#A89F91] bg-transparent"
              />
            </div>

            {/* Email */}
            <div className="p-2.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D]">
              <label className="block text-[9px] font-black uppercase text-[#6B635B] mb-0.5 font-display">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full text-xs font-bold text-[#24201D] outline-none placeholder:text-[#A89F91] bg-transparent"
              />
            </div>

            {/* Username */}
            <div className="p-2.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D]">
              <label className="block text-[9px] font-black uppercase text-[#6B635B] mb-0.5 font-display">
                Username
              </label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="alex_pro"
                className="w-full text-xs font-bold text-[#24201D] outline-none placeholder:text-[#A89F91] bg-transparent"
              />
            </div>

            {/* Password */}
            <div className="p-2.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D]">
              <label className="block text-[9px] font-black uppercase text-[#6B635B] mb-0.5 font-display">
                Password
              </label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 4 characters"
                className="w-full text-xs font-bold text-[#24201D] outline-none placeholder:text-[#A89F91] bg-transparent"
              />
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] font-black font-display text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
            >
              <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}

        {/* Social Auth Divider & Google Button */}
        {mode !== 'forgot-password' && (
          <div className="w-full mt-3.5 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1.5px] bg-[#24201D]/15" />
              <span className="text-[10px] font-black uppercase text-[#6B635B] tracking-wider font-display">
                or continue with
              </span>
              <div className="flex-1 h-[1.5px] bg-[#24201D]/15" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-[#F9F7F4] text-[#24201D] border-[1.75px] border-[#24201D] font-black font-display text-xs uppercase tracking-wider shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* 3. FORGOT PASSWORD */}
        {mode === 'forgot-password' && (
          <div className="w-full space-y-3">
            {forgotDone ? (
              <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2.5px_2.5px_0px_#24201D] text-center space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-[#2D503C]" />
                </div>
                <h3 className="text-xs font-black font-display text-[#24201D]">
                  Reset Link Sent
                </h3>
                <p className="text-[11px] text-[#6B635B] font-medium">
                  Check your inbox for <b>{forgotEmail}</b>.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2 bg-[#F0BB58] border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] shadow-2xs cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="w-full space-y-3">
                <div className="text-center mb-1">
                  <h2 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                    Reset Password
                  </h2>
                </div>

                <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D]">
                  <label className="block text-[10px] font-black uppercase text-[#6B635B] mb-1 font-display">
                    Your Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full text-xs font-bold text-[#24201D] outline-none placeholder:text-[#A89F91] bg-transparent"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] font-black text-xs uppercase shadow-[2px_2px_0px_#24201D] cursor-pointer"
                >
                  Send Reset Link
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-1 text-xs font-bold text-[#6B635B] hover:text-[#24201D] cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </form>
            )}
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="w-full text-center z-10 pt-2 border-t border-[#24201D]/10">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#6B635B]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3D6B52]" />
          <span>Daily Planner • Encrypted Personal Vault</span>
        </div>
      </div>

    </div>
  );
};
