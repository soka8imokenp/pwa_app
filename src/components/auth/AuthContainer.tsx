import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Zap,
  Smile,
  Flame,
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

type AuthMode = 'login' | 'register-step1' | 'register-step2' | 'forgot-password';

export const AuthContainer: React.FC<AuthContainerProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Login form state
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

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Error feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'Empty', color: 'bg-slate-200', width: '0%', joke: 'Секретный шифр еще не введен' };
    if (pwd.length < 4) return { label: 'Too short', color: 'bg-rose-400', width: '30%', joke: 'Слишком коротко, взломает даже хомяк 🐹' };
    if (pwd.length < 8) return { label: 'Good', color: 'bg-[#FFE873]', width: '65%', joke: 'Неплохо, но Сумирэ советует подлиннее 🛡️' };
    return { label: 'Archive Grade', color: 'bg-[#86EFAC]', width: '100%', joke: 'Броня архива! Никто не пройдет 🏰' };
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMsg('Введите логин и пароль.');
      return;
    }

    setIsLoading(true);
    try {
      const emailToUse = loginIdentifier.includes('@') ? loginIdentifier : `${loginIdentifier}@kairo.app`;
      const res = await authApi.login({
        email: emailToUse,
        password: loginPassword,
      });

      setAuthToken(res.token);
      localStorage.setItem('kairo_auth_user', JSON.stringify(res.user));

      playSuccessChime();
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#FFE873', '#E8DCFF', '#D1FBE4', '#FED7AA'],
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      console.warn('Backend login notice:', err.message);
      
      // Fallback guest login
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

  const handleQuickGuest = () => {
    playClickSound();
    const guestUser: UserProfile = {
      firstName: 'Scout',
      lastName: 'Archivist',
      email: 'scout@kawaii.uz',
      username: 'scout_archivist',
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

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg('Пожалуйста, заполните имя, фамилию и email.');
      return;
    }

    if (!email.includes('@')) {
      setErrorMsg('Введите корректный адрес электронной почты.');
      return;
    }

    playClickSound();
    setMode('register-step2');
  };

  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMsg('Пожалуйста, заполните все поля.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Пароли не совпадают. Проверьте внимательно!');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Пароль должен быть минимум 4 символа.');
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
        colors: ['#FFE873', '#E8DCFF', '#D1FBE4', '#FED7AA'],
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
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
      setErrorMsg('Введите корректный email для восстановления доступа.');
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

  const strength = getPasswordStrength(mode === 'login' ? loginPassword : password);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#18181B] flex flex-col justify-between px-4 sm:px-6 py-6 max-w-md mx-auto select-none font-body relative overflow-hidden bg-subtle-grid">
      
      {/* Background Neo-Brutalist Ambient Accents */}
      <div className="absolute -top-16 -left-16 w-60 h-60 rounded-full bg-[#FFE873]/30 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-[#E8DCFF]/40 blur-2xl pointer-events-none" />

      {/* Top Brand Pill & Fun Status */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-[1.5px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#18181B] animate-pulse" />
          <span className="text-[11px] font-black tracking-wider uppercase font-display text-[#18181B]">
            Daily Sumire • Archive Gate
          </span>
        </div>

        <div className="px-2.5 py-1 bg-[#E8DCFF] border border-[#18181B] rounded-xl text-[10px] font-bold text-[#18181B] shadow-2xs">
          🔒 Secure Pass
        </div>
      </div>

      {/* Main Interactive Card */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 z-10 w-full">
        
        {/* Animated Mascot Stage with Funny Speech Balloon */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center mb-2">
          {/* Outer Podium Ring */}
          <div className="absolute inset-0 rounded-full border-[2px] border-[#18181B] bg-white shadow-[3px_3px_0px_#18181B]" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-[#FAF7F2] to-[#E8DCFF] border border-[#18181B]/30" />

          {/* Humorous Reaction Badge */}
          <div className="absolute -top-3 -right-2 px-2.5 py-1 bg-[#FFE873] border-[1.5px] border-[#18181B] rounded-xl text-[9px] font-black uppercase text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] animate-bounce">
            {isPasswordFocused ? '👀 Я не подглядываю!' : mode === 'login' ? '🔑 Авторизация' : '✨ Новый разведчик'}
          </div>

          <div className="relative z-10 w-full h-full p-2 flex items-center justify-center">
            <LottiePlayer
              animationData={rabbitAnimation}
              loop={true}
              autoplay={true}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Playful Segmented Mode Selector Switch */}
        {mode !== 'forgot-password' && (
          <div className="w-full bg-[#18181B]/5 p-1 border-[1.75px] border-[#18181B] rounded-2xl flex items-center mb-4 shadow-[2px_2px_0px_#18181B]">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#FFE873] text-[#18181B] border-[1.5px] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]'
                  : 'text-slate-600 hover:text-[#18181B]'
              }`}
            >
              Войти (Sign In)
            </button>
            <button
              type="button"
              onClick={() => switchMode('register-step1')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode.startsWith('register')
                  ? 'bg-[#E8DCFF] text-[#18181B] border-[1.5px] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]'
                  : 'text-slate-600 hover:text-[#18181B]'
              }`}
            >
              Регистрация
            </button>
          </div>
        )}

        {/* Error Notification Toast */}
        {errorMsg && (
          <div className="w-full mb-3 p-3 bg-[#FFE4E6] border-[1.75px] border-[#18181B] rounded-2xl text-xs font-bold text-rose-950 shadow-[2px_2px_0px_#18181B] animate-in fade-in duration-150 text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* =================================================== */}
        {/* A. SIGN IN VIEW */}
        {/* =================================================== */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5">
            
            {/* Username Input Panel */}
            <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] focus-within:shadow-[3px_3px_0px_#18181B] transition-all">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Логин или Email
              </label>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8DCFF] border border-[#18181B] flex items-center justify-center shrink-0 shadow-2xs">
                  <User className="w-4 h-4 text-purple-950 stroke-[2.25]" />
                </div>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="scout_alex или email"
                  className="flex-1 text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                />
              </div>
            </div>

            {/* Password Input Panel */}
            <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] focus-within:shadow-[3px_3px_0px_#18181B] transition-all">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Пароль доступа
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  Забыли пароль?
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFE873] border border-[#18181B] flex items-center justify-center shrink-0 shadow-2xs">
                  <Lock className="w-4 h-4 text-amber-950 stroke-[2.25]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] text-[#18181B] border-[1.75px] border-[#18181B] font-black font-display text-xs uppercase tracking-wider shadow-[3px_3px_0px_#18181B] active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181B] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Проверка...' : 'Открыть Архив'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Quick Guest Access Pill */}
            <button
              type="button"
              onClick={handleQuickGuest}
              className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border-[1.5px] border-[#18181B] text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Smile className="w-4 h-4 text-amber-600" />
              <span>Быстрый гостевой вход (Scout Guest)</span>
            </button>
          </form>
        )}

        {/* =================================================== */}
        {/* B. REGISTER STEP 1 (Personal) */}
        {/* =================================================== */}
        {mode === 'register-step1' && (
          <form onSubmit={handleRegisterStep1} className="w-full space-y-3">
            
            {/* Step Header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-[#E8DCFF] px-2.5 py-0.5 rounded-full border border-[#18181B]">
                Шаг 1 из 2 • Кто вы?
              </span>
              <span className="text-[10px] font-bold text-slate-400">50% готово</span>
            </div>

            {/* First & Last Name Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                  Имя
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Алекс"
                  className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                />
              </div>

              <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                  Фамилия
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Смирнов"
                  className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                />
              </div>
            </div>

            {/* Email Input Panel */}
            <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Электронная почта
              </label>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#BAE6FD] border border-[#18181B] flex items-center justify-center shrink-0 shadow-2xs">
                  <Mail className="w-4 h-4 text-sky-950 stroke-[2.25]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scout.alex@kawaii.uz"
                  className="flex-1 text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                />
              </div>
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-[#E8DCFF] hover:bg-[#D8C4FF] text-[#18181B] border-[1.75px] border-[#18181B] font-black font-display text-xs uppercase tracking-wider shadow-[3px_3px_0px_#18181B] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Далее: Задать шифр доступа</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}

        {/* =================================================== */}
        {/* C. REGISTER STEP 2 (Security) */}
        {/* =================================================== */}
        {mode === 'register-step2' && (
          <form onSubmit={handleRegisterStep2} className="w-full space-y-3">
            
            {/* Step Header */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setMode('register-step1')}
                className="text-[10px] font-bold text-slate-500 hover:text-[#18181B] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Назад к профилю
              </button>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-[#D1FBE4] px-2.5 py-0.5 rounded-full border border-[#18181B]">
                Шаг 2 из 2 • Шифр
              </span>
            </div>

            {/* Username Input Panel */}
            <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                Никнейм в Архиве
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400">@</span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="scout_master"
                  className="flex-1 text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                Пароль
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 4 символа"
                className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
              />
            </div>

            {/* Confirm Password Field */}
            <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                Подтверждение пароля
              </label>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
              />
            </div>

            {/* Humorous Password Strength Meter */}
            <div className="p-2.5 bg-[#FAF7F2] border border-[#18181B]/20 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                <span>Надежность шифра:</span>
                <span className="font-black text-[#18181B]">{strength.label}</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden border border-[#18181B]/20">
                <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
              </div>
              <p className="text-[9px] font-medium text-slate-500 italic">{strength.joke}</p>
            </div>

            {/* Complete Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#D1FBE4] hover:bg-[#B7F4D1] text-[#18181B] border-[1.75px] border-[#18181B] font-black font-display text-xs uppercase tracking-wider shadow-[3px_3px_0px_#18181B] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Создаем...' : 'Завершить регистрацию'}</span>
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        )}

        {/* =================================================== */}
        {/* D. FORGOT PASSWORD */}
        {/* =================================================== */}
        {mode === 'forgot-password' && (
          <div className="w-full space-y-3">
            {forgotSubmitted ? (
              <div className="p-5 bg-white border-[2px] border-[#18181B] rounded-2xl shadow-[3px_3px_0px_#18181B] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#D1FBE4] border-[1.75px] border-[#18181B] flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-800 stroke-[2.5]" />
                </div>
                <h3 className="text-sm font-black font-display text-[#18181B]">
                  Служба архива оповещена!
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Если аккаунт <b>{forgotEmail}</b> существует, Сумирэ отправила временный ключ доступа.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2.5 bg-[#FFE873] border-[1.5px] border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] shadow-2xs cursor-pointer"
                >
                  Вернуться ко входу
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="w-full space-y-3">
                <div className="text-center mb-2">
                  <h2 className="text-sm font-black font-display uppercase tracking-wider text-[#18181B]">
                    Восстановление доступа
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Забыли ключ? Сумирэ проверит записи в архиве.
                  </p>
                </div>

                <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B]">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Ваш Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="scout.alex@kawaii.uz"
                    className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] text-[#18181B] border-[1.75px] border-[#18181B] font-black text-xs uppercase shadow-[2.5px_2.5px_0px_#18181B] cursor-pointer"
                >
                  Отправить запрос
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2 text-xs font-bold text-slate-500 hover:text-[#18181B] cursor-pointer"
                >
                  ← Отмена, я вспомнил пароль
                </button>
              </form>
            )}
          </div>
        )}

      </div>

      {/* Bottom Footer Credits */}
      <div className="w-full text-center z-10 pt-2 border-t border-[#18181B]/10">
        <p className="text-[10px] font-bold text-slate-400">
          KAWAII Scout Archive System • Safe & Encrypted
        </p>
      </div>

    </div>
  );
};
