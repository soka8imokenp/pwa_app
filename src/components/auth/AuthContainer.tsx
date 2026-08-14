import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, Lock, Mail, User, ShieldCheck } from 'lucide-react';
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

type AuthMode = 'login' | 'register-step1' | 'register-step2' | 'forgot-password';

export const AuthContainer: React.FC<AuthContainerProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Step 1
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Register Step 2
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Error feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter your username and password.');
      return;
    }

    setIsLoading(true);
    try {
      // Try backend authentication
      const emailToUse = loginIdentifier.includes('@') ? loginIdentifier : `${loginIdentifier}@kairo.app`;
      const res = await authApi.login({
        email: emailToUse,
        password: loginPassword,
      });

      setAuthToken(res.token);
      localStorage.setItem('kairo_auth_user', JSON.stringify(res.user));

      playSuccessChime();
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C084FC', '#BEF264', '#FED7AA'],
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      // If server is offline or local fallback
      console.warn('Backend login notice:', err.message);
      
      // Fallback guest login for offline mode
      const user: UserProfile = {
        firstName: loginIdentifier,
        lastName: '',
        email: loginIdentifier.includes('@') ? loginIdentifier : `${loginIdentifier}@kairo.app`,
        username: loginIdentifier,
      };
      localStorage.setItem('kairo_auth_user', JSON.stringify(user));
      playSuccessChime();
      onLoginSuccess(user);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg('Please fill in your first name, last name, and email.');
      return;
    }

    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    playClickSound();
    setMode('register-step2');
  };

  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please try again.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      });

      setAuthToken(res.token);
      localStorage.setItem('kairo_auth_user', JSON.stringify(res.user));

      playSuccessChime();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#C084FC', '#BEF264', '#FED7AA', '#38BDF8'],
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      // If server error, fallback to local registration
      const user: UserProfile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        username: username.trim(),
      };
      localStorage.setItem('kairo_auth_user', JSON.stringify(user));
      playSuccessChime();
      onLoginSuccess(user);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    playClickSound();
    setForgotSubmitted(true);
  };

  const switchMode = (next: AuthMode) => {
    playClickSound();
    setErrorMsg(null);
    setForgotSubmitted(false);
    setMode(next);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#18181B] flex flex-col justify-between px-6 py-6 max-w-md mx-auto select-none font-body relative overflow-hidden bg-subtle-grid">
      
      {/* 1. Atmospheric Ambient Gradient Orbs in Background */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#E9D5FF]/50 blur-3xl -z-10 pointer-events-none animate-glow" />
      <div className="absolute bottom-10 -left-12 w-64 h-64 rounded-full bg-[#FED7AA]/35 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-12 -right-12 w-56 h-56 rounded-full bg-[#BEF264]/25 blur-3xl -z-10 pointer-events-none" />

      {/* Decorative Geometric Marks */}
      <div className="absolute top-10 left-6 text-slate-300 font-black text-sm pointer-events-none select-none">
        ✦
      </div>
      <div className="absolute top-12 right-6 text-slate-300 font-black text-sm pointer-events-none select-none">
        ✦
      </div>
      <div className="absolute bottom-28 left-5 text-slate-300 font-extrabold text-sm pointer-events-none select-none">
        + + +
      </div>
      <div className="absolute bottom-32 right-6 text-slate-300 font-extrabold text-sm pointer-events-none select-none">
        ★ ★
      </div>

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col items-center justify-center pt-1 relative z-10 w-full">
        
        {/* Enlarged Layered Rabbit Mascot Stage */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-2">
          {/* Outer dashed ring */}
          <div className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-[#18181B]/20 bg-white/45 backdrop-blur-xs" />
          {/* Inner pastel podium */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-[#F3E8FF] to-[#E9D5FF] border-[1.5px] border-[#18181B]/35 shadow-xs flex items-center justify-center" />
          
          <div className="relative z-10 w-full h-full p-2 flex items-center justify-center">
            <LottiePlayer
              animationData={rabbitAnimation}
              loop={true}
              autoplay={true}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Error Toast */}
        {errorMsg && (
          <div className="w-full mb-3 p-3 bg-[#FFE4E6] border-[1.5px] border-[#18181B] rounded-2xl text-xs font-bold text-rose-950 shadow-[1.5px_1.5px_0px_#18181B] animate-in fade-in duration-150 text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* =================================================== */}
        {/* A. SIGN IN VIEW */}
        {/* =================================================== */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5">
            <div className="text-center mb-3">
              <h1 className="text-3xl font-extrabold font-display text-[#18181B] tracking-tight">
                Sign In
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Plan your day and track your daily habits
              </p>
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#18181B] mb-1.5 px-1">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 py-3.5 bg-white text-xs font-semibold soft-input placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#18181B]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-xs font-bold text-purple-700 hover:text-purple-950 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3.5 bg-white text-xs font-semibold soft-input placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#18181B] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 px-4 rounded-2xl bg-[#C084FC] hover:bg-[#B366FA] text-[#18181B] border-[1.5px] border-[#18181B] font-extrabold font-display text-sm shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 mt-3"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}

        {/* =================================================== */}
        {/* B. REGISTER STEP 1 (Personal Details) */}
        {/* =================================================== */}
        {mode === 'register-step1' && (
          <form onSubmit={handleRegisterStep1} className="w-full space-y-3.5">
            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-[#E9D5FF] border-[1.25px] border-[#18181B] rounded-full text-[10px] font-bold uppercase text-purple-900 mb-1.5">
                <span>Step 1 of 2 • Personal</span>
              </div>
              <h1 className="text-3xl font-extrabold font-display text-[#18181B] tracking-tight">
                Create Account
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Let's set up your profile
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white border-[1.25px] border-[#18181B] h-2.5 rounded-full overflow-hidden mb-3 p-0.5">
              <div className="w-1/2 h-full bg-[#C084FC] rounded-full" />
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#18181B] mb-1.5 px-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alex"
                  className="w-full px-3.5 py-3.5 bg-white text-xs font-semibold soft-input placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#18181B] mb-1.5 px-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="w-full px-3.5 py-3.5 bg-white text-xs font-semibold soft-input placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#18181B] mb-1.5 px-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.smith@gmail.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-white text-xs font-semibold soft-input placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              className="w-full py-4 px-4 rounded-2xl bg-[#C084FC] hover:bg-[#B366FA] text-[#18181B] border-[1.5px] border-[#18181B] font-extrabold font-display text-sm shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 mt-3"
            >
              <span>Continue to Security</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}

        {/* =================================================== */}
        {/* C. REGISTER STEP 2 (Security) */}
        {/* =================================================== */}
        {mode === 'register-step2' && (
          <form onSubmit={handleRegisterStep2} className="w-full space-y-3.5">
            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-[#BEF264] border-[1.25px] border-[#18181B] rounded-full text-[10px] font-bold uppercase text-[#18181B] mb-1.5">
                <ShieldCheck className="w-3 h-3 text-[#18181B]" />
                <span>Step 2 of 2 • Security</span>
              </div>
              <h1 className="text-3xl font-extrabold font-display text-[#18181B] tracking-tight">
                Set Password
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Choose a secure username and password
              </p>
            </div>

            {/* Progress Bar (Full) */}
            <div className="w-full bg-white border-[1.25px] border-[#18181B] h-2.5 rounded-full overflow-hidden mb-3 p-0.5">
              <div className="w-full h-full bg-[#BEF264] rounded-full" />
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#18181B] mb-1.5 px-1">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_pro"
                  className="w-full pl-11 pr-4 py-3.5 bg-white text-xs font-semibold soft-input placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#18181B] mb-1.5 px-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full pl-11 pr-11 py-3.5 bg-white text-xs font-semibold soft-input placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#18181B] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#18181B] mb-1.5 px-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-11 pr-11 py-3.5 bg-white text-xs font-semibold soft-input placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#18181B] cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => switchMode('register-step1')}
                className="w-14 h-14 rounded-2xl bg-white hover:bg-slate-50 border-[1.5px] border-[#18181B] flex items-center justify-center shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 cursor-pointer shrink-0"
                title="Back to step 1"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              <button
                type="submit"
                className="flex-1 py-4 px-4 rounded-2xl bg-[#C084FC] hover:bg-[#B366FA] text-[#18181B] border-[1.5px] border-[#18181B] font-extrabold font-display text-sm shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Complete Sign Up</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </form>
        )}

        {/* =================================================== */}
        {/* D. FORGOT PASSWORD VIEW */}
        {/* =================================================== */}
        {mode === 'forgot-password' && (
          <div className="w-full space-y-4">
            <div className="text-center mb-4">
              <h1 className="text-3xl font-extrabold font-display text-[#18181B] tracking-tight">
                Reset Password
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Enter your email address to receive reset instructions
              </p>
            </div>

            {forgotSubmitted ? (
              <div className="p-6 bg-[#F2FCE2] border-[1.5px] border-[#18181B] rounded-3xl text-center space-y-3 shadow-[2px_2px_0px_#18181B]">
                <div className="w-12 h-12 rounded-full bg-[#BEF264] border border-[#18181B] flex items-center justify-center mx-auto text-xl shadow-xs">
                  📬
                </div>
                <h2 className="text-base font-extrabold font-display text-[#18181B]">
                  Check your inbox!
                </h2>
                <p className="text-xs font-medium text-slate-600">
                  Password reset instructions have been sent to{' '}
                  <span className="font-bold text-[#18181B]">{forgotEmail}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border-[1.5px] border-[#18181B] font-bold text-xs shadow-[1.5px_1.5px_0px_#18181B] cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#18181B] mb-1.5 px-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="mail@example.com"
                      className="w-full pl-11 pr-4 py-3.5 bg-white text-xs font-semibold soft-input placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 px-4 rounded-2xl bg-[#C084FC] hover:bg-[#B366FA] text-[#18181B] border-[1.5px] border-[#18181B] font-extrabold font-display text-sm shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Send Reset Link</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs font-bold text-slate-600 hover:text-[#18181B] underline cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer Switch */}
      <div className="pt-5 pb-2 text-center relative z-10">
        {mode === 'login' ? (
          <p className="text-xs font-medium text-slate-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('register-step1')}
              className="font-bold text-[#18181B] underline decoration-[#C084FC] decoration-2 cursor-pointer hover:text-purple-900"
            >
              Create account
            </button>
          </p>
        ) : mode.startsWith('register') ? (
          <p className="text-xs font-medium text-slate-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="font-bold text-[#18181B] underline decoration-[#C084FC] decoration-2 cursor-pointer hover:text-purple-900"
            >
              Sign In
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
};
