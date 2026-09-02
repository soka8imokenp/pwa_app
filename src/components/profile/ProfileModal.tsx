import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  AtSign,
  Smile,
  LogOut,
  Check,
  Shield,
  Flame,
  CheckCircle2,
  Sparkles,
  Save,
} from 'lucide-react';
import type { UserProfile } from '../auth/AuthContainer';
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
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  onLogout,
  streakCount = 0,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('sumire-scout');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setEmail(currentUser.email || '');
      setUsername(currentUser.username || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_selected_avatar');
      if (saved) setSelectedAvatar(saved);
    }
  }, []);

  if (!isOpen || !currentUser) return null;

  const activeAvatar = getAvatarById(selectedAvatar);

  const handleSelectAvatar = (id: string) => {
    playClickSound();
    setSelectedAvatar(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_selected_avatar', id);
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccessChime();

    const updated: UserProfile = {
      ...currentUser,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim(),
    };

    onUpdateProfile(updated);
    localStorage.setItem('kairo_auth_user', JSON.stringify(updated));
    setFeedback('Profile updated successfully!');
    setIsEditing(false);

    confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.6 },
      colors: ['#3D6B52', '#E09F3E', '#DDE8DE'],
    });

    setTimeout(() => setFeedback(null), 2500);
  };

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to sign out of this vault?')) {
      playClickSound();
      onClose();
      onLogout();
    }
  };

  const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.username || 'Daily User';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DDE8DE] border-[1.5px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <User className="w-4.5 h-4.5 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                User Profile
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Account & Identity Management
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#F4F0EA] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3 rounded-2xl bg-[#DDE8DE] border border-[#24201D] text-xs font-bold text-[#2D503C] flex items-center gap-2 shadow-2xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#3D6B52] stroke-[2.5] shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 1. Profile Hero Card */}
        <div className="p-4 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-3xl shadow-[2px_2px_0px_#24201D] flex items-center gap-3.5">
          <div
            className="w-16 h-16 rounded-2xl border-[1.75px] border-[#24201D] flex items-center justify-center p-1 shadow-2xs shrink-0"
            style={{ backgroundColor: activeAvatar.bg }}
          >
            {activeAvatar.renderSvg('w-full h-full')}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-black font-display text-[#24201D] truncate">
                {fullName}
              </h4>
              <span className="w-2 h-2 rounded-full bg-[#3D6B52]" />
            </div>
            <p className="text-[11px] font-medium text-[#6B635B] truncate">
              {currentUser.email}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] font-black uppercase text-[#2D503C] bg-[#DDE8DE] px-2 py-0.5 rounded-full border border-[#24201D]/20">
                @{currentUser.username || 'user'}
              </span>
              <span className="text-[9px] font-bold text-[#854D0E] bg-[#FBECCF] px-2 py-0.5 rounded-full border border-[#24201D]/20 flex items-center gap-1">
                <Flame className="w-2.5 h-2.5 fill-[#E09F3E] text-[#C25E40]" />
                <span>{streakCount}d Streak</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Mascot Avatar Selector */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#F0BB58] border border-[#24201D] flex items-center justify-center shadow-2xs">
                <Smile className="w-3.5 h-3.5 text-[#24201D] stroke-[2.25]" />
              </div>
              <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Mascot Avatar
              </h4>
            </div>
            <span className="text-[10px] font-bold text-[#2D503C] bg-[#DDE8DE] px-2 py-0.5 rounded-full border border-[#24201D]">
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
                  className={`p-1.5 rounded-2xl border-[1.75px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#24201D] shadow-[2px_2px_0px_#24201D] scale-105 ring-2 ring-[#3D6B52]'
                      : 'border-stone-200 hover:border-[#24201D] opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: avatar.bg }}
                  title={avatar.name}
                >
                  <div className="w-9 h-9">
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

        {/* 3. Edit Account Information Form */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
              Account Details
            </h4>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsEditing(!isEditing);
              }}
              className="text-[10px] font-black text-[#3D6B52] underline cursor-pointer"
            >
              {isEditing ? 'Cancel' : 'Edit Information'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#6B635B] mb-1 px-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4F0EA] border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs"
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
                    className="w-full px-3 py-2 bg-[#F4F0EA] border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs"
                  />
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
                    className="w-full pl-8 pr-3 py-2 bg-[#F4F0EA] border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs"
                  />
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-[#6B635B] mb-1 px-1">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#F4F0EA] border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] outline-none shadow-2xs"
                  />
                  <AtSign className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.5px] border-[#24201D] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 px-3 bg-[#F4F0EA] rounded-xl border border-[#24201D]/20">
                <span className="text-[#6B635B] font-medium">Full Name</span>
                <span className="font-bold text-[#24201D]">{fullName}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 bg-[#F4F0EA] rounded-xl border border-[#24201D]/20">
                <span className="text-[#6B635B] font-medium">Email</span>
                <span className="font-bold text-[#24201D]">{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 bg-[#F4F0EA] rounded-xl border border-[#24201D]/20">
                <span className="text-[#6B635B] font-medium">Vault Type</span>
                <span className="font-bold text-[#3D6B52] flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Offline Encrypted</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Sign Out Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full py-3 px-4 bg-[#F7E3DC] hover:bg-[#F0D0C5] text-[#C25E40] border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 transition-all uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4 stroke-[2.5]" />
            <span>Sign Out of Vault</span>
          </button>
        </div>

      </div>
    </div>
  );
};
