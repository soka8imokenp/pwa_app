import React, { useState } from 'react';
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
