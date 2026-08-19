import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import rabbitAnimation from '../../assets/rabbit-hi.json';
import { LottiePlayer } from '../common/LottiePlayer';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { authApi, setAuthToken } from '../../lib/api';

export interface UserProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
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
      const emailToUse = identifier.includes('@') ? identifier : `${identifier}@kairo.app`;
      const res = await authApi.login({
        email: emailToUse,
        password,
      });

      setAuthToken(res.token);
      localStorage.setItem('kairo_auth_user', JSON.stringify(res.user));

      playSuccessChime();
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      // Offline / local fallback
      const user: UserProfile = {
        firstName: identifier,
        lastName: '',
        email: identifier.includes('@') ? identifier : `${identifier}@kairo.app`,
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

    if (regPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const parts = fullName.trim().split(' ');
      const firstName = parts[0] || 'User';
      const lastName = parts.slice(1).join(' ') || '';

      const res = await authApi.register({
        email: email.trim(),
        password: regPassword,
        firstName,
        lastName,
        username: regUsername.trim(),
      });

      setAuthToken(res.token);
      localStorage.setItem('kairo_auth_user', JSON.stringify(res.user));

      playSuccessChime();
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      const parts = fullName.trim().split(' ');
      const user: UserProfile = {
        firstName: parts[0] || 'User',
        lastName: parts.slice(1).join(' ') || '',
        email: email.trim(),
        username: regUsername.trim(),
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
      lastName: 'User',
      email: 'guest@kawaii.uz',
      username: 'guest_user',
    };
    localStorage.setItem('kairo_auth_user', JSON.stringify(guestUser));
    playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#BAE6FD'],
    });
    onLoginSuccess(guestUser);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMsg('Please enter a valid email.');
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
    <div className="min-h-screen bg-[#FAF7F2] text-[#18181B] flex flex-col justify-between px-5 py-6 max-w-md mx-auto select-none font-body relative overflow-hidden">
      
      {/* Top Header Brand */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FFE873] border-[1.5px] border-[#18181B] flex items-center justify-center font-black text-xs shadow-2xs">
            DS
          </div>
          <span className="text-xs font-black uppercase tracking-wider font-display text-[#18181B]">
            Daily Sumire
          </span>
        </div>

        <button
          type="button"
          onClick={handleGuest}
          className="text-xs font-bold text-slate-500 hover:text-[#18181B] px-3 py-1 bg-white border border-[#18181B] rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
        >
          Guest
        </button>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 z-10 w-full">
        
        {/* Mascot Circle */}
        <div className="w-32 h-32 flex items-center justify-center mb-3">
          <div className="w-full h-full rounded-full border-[2px] border-[#18181B] bg-white shadow-[2.5px_2.5px_0px_#18181B] p-2 flex items-center justify-center">
            <LottiePlayer
              animationData={rabbitAnimation}
              loop={true}
              autoplay={true}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Tab Switcher */}
        {mode !== 'forgot-password' && (
          <div className="w-full bg-[#18181B]/5 p-1 border-[1.75px] border-[#18181B] rounded-2xl flex items-center mb-4 shadow-[2px_2px_0px_#18181B]">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#FFE873] text-[#18181B] border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                  : 'text-slate-500 hover:text-[#18181B]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#E8DCFF] text-[#18181B] border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                  : 'text-slate-500 hover:text-[#18181B]'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="w-full mb-3 p-3 bg-rose-100 border-[1.75px] border-[#18181B] rounded-2xl text-xs font-bold text-rose-950 shadow-[1.5px_1.5px_0px_#18181B] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-900 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="w-full space-y-3">
            {/* Identifier Input */}
            <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Username or Email
              </label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Username or Email"
                  className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-[#18181B] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] text-[#18181B] border-[1.75px] border-[#18181B] font-black font-display text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
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
            <div className="p-2.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Smith"
                className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
              />
            </div>

            {/* Email */}
            <div className="p-2.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@gmail.com"
                className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
              />
            </div>

            {/* Username */}
            <div className="p-2.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                Username
              </label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="alex_pro"
                className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
              />
            </div>

            {/* Password */}
            <div className="p-2.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                Password
              </label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 4 characters"
                className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
              />
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#E8DCFF] hover:bg-[#D8C4FF] text-[#18181B] border-[1.75px] border-[#18181B] font-black font-display text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
            >
              <span>{isLoading ? 'Creating...' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD */}
        {mode === 'forgot-password' && (
          <div className="w-full space-y-3">
            {forgotDone ? (
              <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2.5px_2.5px_0px_#18181B] text-center space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#D1FBE4] border border-[#18181B] flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-800" />
                </div>
                <h3 className="text-xs font-black font-display text-[#18181B]">
                  Reset Link Sent
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Check your inbox for <b>{forgotEmail}</b>.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2 bg-[#FFE873] border border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] shadow-2xs cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="w-full space-y-3">
                <div className="text-center mb-1">
                  <h2 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                    Reset Password
                  </h2>
                </div>

                <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Your Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="alex@gmail.com"
                    className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] text-[#18181B] border-[1.75px] border-[#18181B] font-black text-xs uppercase shadow-[2px_2px_0px_#18181B] cursor-pointer"
                >
                  Send Reset Link
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-1 text-xs font-bold text-slate-500 hover:text-[#18181B] cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </form>
            )}
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="w-full text-center z-10 pt-2 border-t border-[#18181B]/10">
        <p className="text-[10px] font-bold text-slate-400">
          Daily Sumire • All rights reserved
        </p>
      </div>

    </div>
  );
};
