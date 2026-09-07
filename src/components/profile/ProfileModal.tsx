import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Mail,
  AtSign,
  Smile,
  LogOut,
  Flame,
  CheckCircle2,
  Save,
  Briefcase,
  Quote,
  Target,
  Download,
  Clock,
  Edit3,
} from 'lucide-react';
import type { UserProfile } from '../auth/AuthContainer';
import type { Task, Habit, HabitLog, FocusSession, HabitWithStats } from '../../types';
import type { OverallActivityStats } from '../../lib/streaks';
import { AVATAR_OPTIONS, getAvatarById } from '../../data/avatars';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onLogout: () => void;
  streakCount?: number;
  allTasks?: Task[];
  habits?: (Habit | HabitWithStats)[];
  allHabitLogs?: HabitLog[];
  allFocusSessions?: FocusSession[];
  activityStats?: OverallActivityStats;
  selectedDate?: string;
}

const ROLE_PRESETS = [
  'Software Engineer',
  'Product Designer',
  'Student / Scholar',
  'Writer & Creator',
  'Zen Seeker',
];

const MOTTO_PRESETS = [
  'Focus on what matters, let the rest flow.',
  'Small steps every day lead to giant leaps.',
  'Calm mind, sharp focus, relentless action.',
  'Build with passion, live with balance.',
  'One task at a time, with complete presence.',
];

const FOCUS_GOAL_OPTIONS = [1, 2, 3, 4, 6, 8];

const WORK_STYLES: {
  id: 'deep_focus' | 'balanced' | 'sprint' | 'zen';
  label: string;
  desc: string;
  badge: string;
}[] = [
  {
    id: 'deep_focus',
    label: 'Deep Focus',
    desc: '50m Flow / 10m Break',
    badge: '50/10',
  },
  {
    id: 'balanced',
    label: 'Classic Pomodoro',
    desc: '25m Focus / 5m Break',
    badge: '25/5',
  },
  {
    id: 'sprint',
    label: 'Flow Sprint',
    desc: '90m Ultradian Sprint',
    badge: '90m',
  },
  {
    id: 'zen',
    label: 'Zen Stopwatch',
    desc: 'Open-ended immersion',
    badge: 'Open',
  },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  onLogout,
  streakCount = 0,
  allTasks = [],
  habits = [],
  allHabitLogs = [],
  allFocusSessions = [],
  activityStats,
  selectedDate = new Date().toISOString().split('T')[0],
}) => {
  // Navigation State: 'overview' vs 'edit'
  const [activeTab, setActiveTab] = useState<'overview' | 'edit'>('overview');

  // Form states for profile editing
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [motto, setMotto] = useState('');
  const [focusDailyGoalHours, setFocusDailyGoalHours] = useState(4);
  const [workStyle, setWorkStyle] = useState<'deep_focus' | 'balanced' | 'sprint' | 'zen'>('deep_focus');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('sumire-scout');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Synchronize initial data from currentUser and localStorage
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setEmail(currentUser.email || '');
      setUsername(currentUser.username || '');
      setRole(currentUser.role || '');
      setMotto(currentUser.motto || 'Focus on what matters, let the rest flow.');
      setFocusDailyGoalHours(currentUser.focusDailyGoalHours || 4);
      setWorkStyle(currentUser.workStyle || 'deep_focus');
    }
  }, [currentUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAvatar = localStorage.getItem('kairo_selected_avatar');
      if (savedAvatar) setSelectedAvatar(savedAvatar);
    }
  }, []);

  // Compute Lifetime Metrics
  const lifetimeStats = useMemo(() => {
    const totalCompletedTasks = allTasks.filter((t) => t.isCompleted).length;
    const totalFocusMinutes = allFocusSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);
    const totalHabitCompletions = allHabitLogs.length;
    const totalActiveDays = activityStats?.activeDatesSet ? activityStats.activeDatesSet.size : (streakCount > 0 ? streakCount : 1);

    // Today's focus sessions
    const todaysFocusMinutes = allFocusSessions
      .filter((s) => s.date === selectedDate)
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const todaysFocusHours = (todaysFocusMinutes / 60).toFixed(1);

    // Level calculation based on completed tasks + focus hours
    const experiencePoints = totalCompletedTasks * 15 + Math.round(totalFocusMinutes * 0.5) + totalHabitCompletions * 10;
    const calculatedLevel = Math.max(1, Math.floor(experiencePoints / 100) + 1);

    return {
      totalCompletedTasks,
      totalFocusMinutes,
      totalFocusHours,
      totalHabitCompletions,
      totalActiveDays,
      todaysFocusMinutes,
      todaysFocusHours,
      calculatedLevel,
    };
  }, [allTasks, allFocusSessions, allHabitLogs, activityStats, streakCount, selectedDate]);

  if (!isOpen || !currentUser) return null;

  const activeAvatar = getAvatarById(selectedAvatar);
  const fullName = `${firstName} ${lastName}`.trim() || currentUser.username || 'Daily User';

  const handleSelectAvatar = (id: string) => {
    playClickSound();
    setSelectedAvatar(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_selected_avatar', id);
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playSuccessChime();

    const updated: UserProfile = {
      ...currentUser,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim(),
      role: role.trim(),
      motto: motto.trim() || 'Focus on what matters, let the rest flow.',
      focusDailyGoalHours,
      workStyle,
      avatarId: selectedAvatar,
    };

    onUpdateProfile(updated);
    localStorage.setItem('kairo_auth_user', JSON.stringify(updated));
    setFeedback('Profile updated successfully!');
    setActiveTab('overview');

    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3D6B52', '#E09F3E', '#DDE8DE', '#FBECCF'],
    });

    setTimeout(() => setFeedback(null), 3000);
  };

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to sign out of this vault?')) {
      playClickSound();
      onClose();
      onLogout();
    }
  };

  const handleExportVaultBackup = () => {
    playClickSound();
    const backupData = {
      exportedAt: new Date().toISOString(),
      user: {
        ...currentUser,
        role,
        motto,
        focusDailyGoalHours,
        workStyle,
        avatarId: selectedAvatar,
      },
      stats: {
        streakCount,
        lifetimeCompletedTasks: lifetimeStats.totalCompletedTasks,
        lifetimeFocusMinutes: lifetimeStats.totalFocusMinutes,
      },
      tasks: allTasks,
      habits,
      habitLogs: allHabitLogs,
      focusSessions: allFocusSessions,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kairo-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    playSuccessChime();
    setFeedback('Vault backup exported as JSON!');
    setTimeout(() => setFeedback(null), 3000);
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#24201D]/55 backdrop-blur-md animate-in fade-in duration-200 font-body select-none">
      <div className="w-full max-w-lg bg-[#FAF8F5] border-[2px] border-[#24201D] rounded-[2.25rem] shadow-[4.5px_4.5px_0px_#24201D] max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Sticky Header Bar */}
        <div className="px-5 py-3.5 bg-white border-b-[2px] border-[#24201D] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <User className="w-4.5 h-4.5 text-[#7E22CE] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Resident Profile
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Identity & Mascot Companion
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#F4F0EA] hover:bg-rose-50 hover:text-rose-600 border-[1.5px] border-[#24201D] flex items-center justify-center text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedback && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] text-xs font-bold text-[#2D503C] flex items-center gap-2 shadow-[2px_2px_0px_#24201D] animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 text-[#3D6B52] stroke-[2.5] shrink-0" />
            <span className="font-black">{feedback}</span>
          </div>
        )}

        {/* Segmented Tab Control */}
        <div className="px-4 sm:px-5 pt-3 pb-1 shrink-0">
          <div className="p-1 bg-[#EAE5DC] border-[1.75px] border-[#24201D] rounded-2xl grid grid-cols-2 gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('overview');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white text-[#24201D] border border-[#24201D] shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveTab('edit');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'bg-white text-[#24201D] border border-[#24201D] shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {activeTab === 'overview' ? (
            /* ========================================================================= */
            /* MINIMALIST OVERVIEW MODE                                                  */
            /* ========================================================================= */
            <>
              {/* 1. Resident Identity Hero Card */}
              <div className="p-4 sm:p-5 bg-white border-[2px] border-[#24201D] rounded-3xl shadow-[3px_3px_0px_#24201D] space-y-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div
                      className="w-16 h-16 rounded-2xl border-[2px] border-[#24201D] flex items-center justify-center p-1 shadow-[2px_2px_0px_#24201D] shrink-0"
                      style={{ backgroundColor: activeAvatar.bg }}
                    >
                      {activeAvatar.renderSvg('w-full h-full')}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-[#F0BB58] text-[#24201D] text-[9px] font-black font-mono-num px-1.5 py-0.2 rounded-md border border-[#24201D] shadow-2xs">
                      Lv.{lifetimeStats.calculatedLevel}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black font-display text-[#24201D] truncate leading-tight">
                        {fullName}
                      </h4>
                      <span className="w-2 h-2 rounded-full bg-[#3D6B52] shrink-0" title="Active" />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {role && (
                        <span className="text-[10px] font-black text-[#2D503C] bg-[#DDE8DE] px-2 py-0.5 rounded-md border border-[#24201D]/30 flex items-center gap-1">
                          <Briefcase className="w-2.5 h-2.5" />
                          <span>{role}</span>
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-[#6B635B] bg-[#F4F0EA] px-2 py-0.5 rounded-md border border-[#24201D]/20">
                        @{currentUser.username || 'resident'}
                      </span>
                    </div>

                    {motto && (
                      <p className="text-[11px] font-bold text-[#6B635B] italic truncate">
                        "{motto}"
                      </p>
                    )}
                  </div>
                </div>

                {/* 3 Core Metric Badges */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#24201D]/10">
                  <div className="p-2 rounded-xl bg-[#FBECCF] border border-[#24201D] flex flex-col items-center text-center shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-[#854D0E] flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-[#E09F3E] text-[#C25E40]" /> Streak
                    </span>
                    <span className="text-sm font-black font-mono-num text-[#24201D] mt-0.5">
                      {streakCount}d
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex flex-col items-center text-center shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-[#2D503C] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Tasks
                    </span>
                    <span className="text-sm font-black font-mono-num text-[#24201D] mt-0.5">
                      {lifetimeStats.totalCompletedTasks}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#EDE9FE] border border-[#24201D] flex flex-col items-center text-center shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-[#6B21A8] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Focus
                    </span>
                    <span className="text-sm font-black font-mono-num text-[#24201D] mt-0.5">
                      {lifetimeStats.totalFocusHours}h
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Active Mascot Companion Selector */}
              <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#F0BB58] border border-[#24201D] flex items-center justify-center shadow-2xs">
                      <Smile className="w-3.5 h-3.5 text-[#24201D] stroke-[2.25]" />
                    </div>
                    <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                      Active Mascot Companion
                    </h4>
                  </div>
                  <span className="text-[10px] font-black text-[#6B635B] font-display">
                    {activeAvatar.name}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {AVATAR_OPTIONS.map((avatar) => {
                    const isSelected = selectedAvatar === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => handleSelectAvatar(avatar.id)}
                        className={`p-2 rounded-2xl border-[1.75px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#24201D] shadow-[2px_2px_0px_#24201D] scale-105 ring-2 ring-[#3D6B52]'
                            : 'border-stone-200 hover:border-[#24201D] opacity-75 hover:opacity-100 bg-[#FAF8F5]'
                        }`}
                        style={{ backgroundColor: isSelected ? avatar.bg : '#FAF8F5' }}
                        title={avatar.name}
                      >
                        <div className="w-8 h-8">
                          {avatar.renderSvg('w-full h-full')}
                        </div>
                        <span className="text-[9px] font-black text-[#24201D] truncate w-full text-center leading-tight">
                          {avatar.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Actions: Backup Data & Sign Out */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleExportVaultBackup}
                  className="py-2.5 px-3 rounded-2xl bg-white hover:bg-[#F4F0EA] border-[1.75px] border-[#24201D] text-xs font-black text-[#24201D] flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Backup JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="py-2.5 px-3 rounded-2xl bg-[#F9E2E5] hover:bg-[#F4CCD1] text-[#8C2B39] border-[1.75px] border-[#8C2B39] text-xs font-black shadow-[2px_2px_0px_#8C2B39] flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            /* ========================================================================= */
            /* DEDICATED EDIT PROFILE PANEL                                              */
            /* ========================================================================= */
            <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in duration-150">
              
              {/* Section 1: Names & Identity */}
              <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] flex items-center gap-1.5 border-b border-[#24201D]/15 pb-2">
                  <User className="w-3.5 h-3.5 text-[#3D6B52]" />
                  <span>Personal Identity</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#6B635B] mb-1 px-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Ken"
                      className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs focus:ring-2 focus:ring-[#3D6B52]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#6B635B] mb-1 px-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Sato"
                      className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs focus:ring-2 focus:ring-[#3D6B52]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#6B635B] mb-1 px-1">
                      Username / Handle
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs focus:ring-2 focus:ring-[#3D6B52]"
                      />
                      <AtSign className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#6B635B] mb-1 px-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs focus:ring-2 focus:ring-[#3D6B52]"
                      />
                      <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Role & Specialty */}
              <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
                <div className="flex items-center justify-between border-b border-[#24201D]/15 pb-2">
                  <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#E09F3E]" />
                    <span>Role & Specialty</span>
                  </h4>
                  <span className="text-[10px] font-bold text-[#6B635B]">
                    Shown on Resident Badge
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Software Engineer / Writer"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs focus:ring-2 focus:ring-[#3D6B52]"
                  />
                </div>

                {/* Quick Role Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {ROLE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRole(p)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        role === p
                          ? 'bg-[#3D6B52] text-white border-[#24201D] shadow-2xs'
                          : 'bg-[#F4F0EA] border-[#24201D]/25 text-[#6B635B] hover:border-[#24201D]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: Personal Motto & Zen Quote */}
              <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
                <div className="flex items-center justify-between border-b border-[#24201D]/15 pb-2">
                  <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-[#C25E40]" />
                    <span>Personal Motto / Daily Mantra</span>
                  </h4>
                  <span className="text-[10px] font-bold text-[#6B635B]">
                    {motto.length}/100
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    maxLength={100}
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="Write an inspirational daily reminder..."
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs focus:ring-2 focus:ring-[#3D6B52]"
                  />
                </div>

                {/* Quick Motto Presets */}
                <div className="space-y-1 pt-1">
                  <p className="text-[9px] font-black uppercase text-[#6B635B] px-1">Quick inspiration:</p>
                  <div className="flex flex-col gap-1">
                    {MOTTO_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMotto(m)}
                        className={`text-left text-[10px] font-medium p-2 rounded-xl border transition-all cursor-pointer ${
                          motto === m
                            ? 'bg-[#FBECCF] border-[#24201D] font-bold text-[#854D0E] shadow-2xs'
                            : 'bg-[#FAF8F5] border-[#24201D]/20 text-[#6B635B] hover:border-[#24201D]'
                        }`}
                      >
                        "{m}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 4: Daily Productivity Goals & Work Style */}
              <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] flex items-center gap-1.5 border-b border-[#24201D]/15 pb-2">
                  <Target className="w-3.5 h-3.5 text-[#3D6B52]" />
                  <span>Daily Focus Targets & Rhythm</span>
                </h4>

                {/* Focus Target Hours */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-[#6B635B] px-1">
                    Daily Focus Goal (Hours / Day)
                  </label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {FOCUS_GOAL_OPTIONS.map((hours) => {
                      const isSelected = focusDailyGoalHours === hours;
                      return (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => setFocusDailyGoalHours(hours)}
                          className={`py-2 rounded-xl text-xs font-black font-mono-num border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#3D6B52] text-white border-[#24201D] shadow-[1.5px_1.5px_0px_#24201D]'
                              : 'bg-[#FAF8F5] border-[#24201D]/25 text-[#6B635B] hover:border-[#24201D]'
                          }`}
                        >
                          {hours}h
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Work Style Selection */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[10px] font-black uppercase text-[#6B635B] px-1">
                    Focus Flow Rhythm
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {WORK_STYLES.map((ws) => {
                      const isSelected = workStyle === ws.id;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => setWorkStyle(ws.id)}
                          className={`p-2.5 rounded-xl border-[1.75px] text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#DDE8DE] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                              : 'bg-[#FAF8F5] border-stone-200 hover:border-[#24201D]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#24201D]">{ws.label}</span>
                            <span className="text-[9px] font-black bg-white px-1.5 py-0.5 rounded border border-[#24201D]/30">
                              {ws.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#6B635B] font-medium mt-0.5">{ws.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 5: Mascot Avatar Choice */}
              <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#24201D]/15 pb-2">
                  <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-[#E09F3E]" />
                    <span>Select Mascot Avatar</span>
                  </h4>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {AVATAR_OPTIONS.map((avatar) => {
                    const isSelected = selectedAvatar === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => handleSelectAvatar(avatar.id)}
                        className={`p-2 rounded-2xl border-[1.75px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#24201D] shadow-[2px_2px_0px_#24201D] scale-105 ring-2 ring-[#3D6B52]'
                            : 'border-stone-200 hover:border-[#24201D] opacity-75 hover:opacity-100 bg-[#FAF8F5]'
                        }`}
                        style={{ backgroundColor: isSelected ? avatar.bg : '#FAF8F5' }}
                        title={avatar.name}
                      >
                        <div className="w-8 h-8">
                          {avatar.renderSvg('w-full h-full')}
                        </div>
                        <span className="text-[9px] font-black text-[#24201D] truncate w-full text-center leading-tight">
                          {avatar.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Sticky Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setActiveTab('overview');
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-stone-100 border-[1.75px] border-[#24201D] text-xs font-black text-[#6B635B] shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-2 py-3 px-4 rounded-2xl bg-[#3D6B52] hover:bg-[#345B45] border-[1.75px] border-[#24201D] text-xs font-black text-white shadow-[2px_2px_0px_#24201D] flex items-center justify-center gap-2 active:translate-y-0.5 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
