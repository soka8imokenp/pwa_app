import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Download,
  Upload,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User,
  ShieldCheck,
  Database,
  Palette,
  RotateCcw,
  Check,
  X,
  Zap,
  Smile,
  Key,
  Bot,
  ArrowUpCircle,
  ExternalLink,
  RefreshCw,
  Moon,
  Lock,
  Unlock,
  Fingerprint,
} from 'lucide-react';
import {
  exportDatabaseToJson,
  downloadBackupFile,
  importDatabaseFromJson,
  resetAndSeedDatabase,
} from '../../lib/exportImport';
import {
  playSuccessChime,
  playClickSound,
  playTaskCheckSound,
  playTimerFinishAlarm,
} from '../../lib/sound';
import { AVATAR_OPTIONS, getAvatarById } from '../../data/avatars';
import type { UserProfile } from '../auth/AuthContainer';
import { checkForAppUpdate, CURRENT_APP_VERSION, AppUpdateInfo } from '../../lib/appUpdater';
import {
  isPinSet,
  isBiometricsEnabled,
  isBiometricsSupported,
  setAppLocked,
} from '../../lib/securityService';
import { SecuritySetupModal } from '../security/SecuritySetupModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  isSoundMuted: boolean;
  onToggleSound: () => void;
  onDataChanged: () => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onShowUpdateModal?: (info: AppUpdateInfo) => void;
  onLockApp?: () => void;
}

const THEME_ACCENTS = [
  { id: 'sage', name: 'Muted Sage', bg: '#8DA385', border: '#262320' },
  { id: 'terracotta', name: 'Terracotta Clay', bg: '#D98A6C', border: '#262320' },
  { id: 'sand', name: 'Warm Sandstone', bg: '#E5D5C0', border: '#262320' },
  { id: 'slate', name: 'Mineral Slate', bg: '#7A8B99', border: '#262320' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isSoundMuted,
  onToggleSound,
  onDataChanged,
  currentUser,
  onLogout,
  onShowUpdateModal,
  onLockApp,
}) => {
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState('sage');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_selected_avatar') || 'sumire-scout';
    }
    return 'sumire-scout';
  });
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_gemini_api_key') || '';
    }
    return '';
  });
  const [showKeyText, setShowKeyText] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [eveningDebriefEnabled, setEveningDebriefEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('kairo_evening_debrief_enabled');
      return val !== null ? val === 'true' : true;
    }
    return true;
  });
  const [eveningDebriefTime, setEveningDebriefTime] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_evening_debrief_time') || '21:00';
    }
    return '21:00';
  });

  const [pinConfigured, setPinConfigured] = useState<boolean>(() => isPinSet());
  const [bioActive, setBioActive] = useState<boolean>(() => isBiometricsEnabled());
  const [bioSupported, setBioSupported] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);

  useEffect(() => {
    isBiometricsSupported().then((supported) => setBioSupported(supported));
  }, []);

  const handleRefreshSecurityState = () => {
    setPinConfigured(isPinSet());
    setBioActive(isBiometricsEnabled());
  };

  const handleToggleEveningDebrief = () => {
    playClickSound();
    const next = !eveningDebriefEnabled;
    setEveningDebriefEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_evening_debrief_enabled', String(next));
    }
  };

  const handleChangeEveningTime = (time: string) => {
    playClickSound();
    setEveningDebriefTime(time);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_evening_debrief_time', time);
    }
  };

  const handleSaveGeminiKey = () => {
    playClickSound();
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_gemini_api_key', geminiKeyInput.trim());
      playSuccessChime();
      setFeedback({ text: 'Gemini API ключ успешно сохранен!', success: true });
    }
  };

  const handleCheckAppUpdate = async () => {
    playClickSound();
    setUpdateChecking(true);
    setUpdateStatus(null);
    try {
      const update = await checkForAppUpdate();
      if (update && update.hasUpdate) {
        if (onShowUpdateModal) {
          onShowUpdateModal(update);
        } else {
          window.open(update.downloadUrl, '_blank');
        }
      } else if (update && !update.hasUpdate) {
        playSuccessChime();
        setUpdateStatus(`You have the latest version (${CURRENT_APP_VERSION})!`);
      } else {
        setUpdateStatus('Could not reach update server. Check your connection or GitHub API.');
      }
    } catch {
      setUpdateStatus('Could not reach update server.');
    } finally {
      setUpdateChecking(false);
    }
  };

  const handleSelectAvatar = (id: string) => {
    playClickSound();
    setSelectedAvatar(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_selected_avatar', id);
      window.dispatchEvent(new Event('storage'));
    }
  };

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const json = await exportDatabaseToJson();
      downloadBackupFile(json);
      playSuccessChime();
      setFeedback({ text: 'Backup downloaded successfully!', success: true });
    } catch (e: any) {
      setFeedback({ text: 'Error exporting database', success: false });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportClick = () => {
    playClickSound();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (text) {
          const res = await importDatabaseFromJson(text);
          if (res.success) {
            playSuccessChime();
            setFeedback({ text: 'Data restored successfully!', success: true });
            onDataChanged();
          } else {
            setFeedback({ text: res.message, success: false });
          }
        }
      };
      reader.readAsText(file);
    } catch (e: any) {
      setFeedback({ text: 'Failed to read backup file', success: false });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm('Reset database and reload fresh sample tasks & habits?')) {
      playClickSound();
      setIsProcessing(true);
      await resetAndSeedDatabase();
      playSuccessChime();
      setFeedback({ text: 'Demo data loaded successfully!', success: true });
      onDataChanged();
      setIsProcessing(false);
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      playClickSound();
      if (onLogout) {
        onLogout();
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <Settings className="w-5 h-5 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#24201D]">
                Settings & Profile
              </h3>
              <p className="text-[10px] font-semibold text-[#6B635B]">
                Preferences, audio & offline backup
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#FAF8F5] hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-stone-600 hover:text-[#24201D] cursor-pointer shadow-2xs active:scale-95"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl border-[1.75px] flex items-center gap-2.5 text-xs font-bold ${feedback.success
                ? 'bg-[#DDE8DE] text-[#2D503C] border-[#24201D] shadow-2xs'
                : 'bg-[#F7E3DC] text-[#C25E40] border-[#24201D] shadow-2xs'
              }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-[#3D6B52] stroke-[2.5] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#C25E40] stroke-[2.5] shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* 1. User Profile Account Capsule */}
        {currentUser && (
          <div className="p-3.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-[2rem] flex items-center justify-between shadow-[2px_2px_0px_#24201D]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[#DDE8DE] border-[1.5px] border-[#24201D] flex items-center justify-center text-lg shadow-2xs shrink-0">
                <User className="w-5 h-5 text-[#2D503C] stroke-[2.25]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black font-display text-[#24201D] truncate">
                  {currentUser.firstName} {currentUser.lastName}
                </h4>
                <p className="text-[10px] font-bold text-[#6B635B] truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogoutClick}
              className="px-3 py-1.5 rounded-full bg-[#F7E3DC] hover:bg-[#F0D0C5] border-[1.5px] border-[#24201D] text-[11px] font-black text-[#C25E40] flex items-center gap-1.5 shadow-2xs cursor-pointer active:translate-y-0.5 shrink-0 transition-all"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* 2. Mascot Avatars Grid */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F0BB58] border border-[#24201D] flex items-center justify-center shadow-xs">
                <Smile className="w-4 h-4 text-[#24201D] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                  Mascot Avatar
                </h4>
                <p className="text-[10px] text-[#6B635B] font-bold">
                  Funny vector character avatars
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-[#2D503C] bg-[#DDE8DE] px-2 py-0.5 rounded-full border border-[#24201D]">
              {getAvatarById(selectedAvatar).name}
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
                  className={`p-1.5 rounded-2xl border-[1.75px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${isSelected
                      ? 'border-[#24201D] shadow-[2px_2px_0px_#24201D] scale-105 ring-2 ring-[#F0BB58]'
                      : 'border-stone-200 hover:border-[#24201D] opacity-80 hover:opacity-100'
                    }`}
                  style={{ backgroundColor: avatar.bg }}
                  title={avatar.name}
                >
                  <div className="w-10 h-10">
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

        {/* 3. Gemini AI API Key Capsule */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                  Gemini AI API Key
                </h4>
                <p className="text-[10px] text-[#6B635B] font-bold">
                  Model: gemini-3.5-flash-lite
                </p>
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#24201D] ${
              geminiKeyInput.trim()
                ? 'bg-[#DDE8DE] text-[#2D503C]'
                : 'bg-[#FBECCF] text-[#854D0E]'
            }`}>
              {geminiKeyInput.trim() ? 'Configured' : 'Not Set'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder="Paste API key from Google AI Studio..."
                  className="w-full pl-8 pr-3 py-2 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl text-xs font-mono outline-none text-[#24201D]"
                />
                <Key className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              </div>

              <button
                type="button"
                onClick={handleSaveGeminiKey}
                className="px-3.5 py-2 bg-[#3D6B52] hover:bg-[#345B45] border-[1.5px] border-[#24201D] rounded-xl text-xs font-black text-white shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0"
              >
                Save
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setShowKeyText(!showKeyText)}
                className="text-[10px] font-bold text-[#6B635B] hover:text-[#24201D] cursor-pointer"
              >
                {showKeyText ? 'Hide characters' : 'Show key'}
              </button>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-[#3D6B52] hover:underline flex items-center gap-1"
              >
                <span>Get free API key</span>
                <ExternalLink className="w-3 h-3 stroke-[2.25]" />
              </a>
            </div>
          </div>
        </div>

        {/* 4. Audio & Haptic Feedback Capsule */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] space-y-2.5 shadow-[2px_2px_0px_#24201D]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center text-xs">
                {isSoundMuted ? (
                  <VolumeX className="w-4 h-4 text-stone-400 stroke-[2.25]" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
                )}
              </div>
              <div>
                <span className="text-xs font-black font-display text-[#24201D] block">
                  Sound Effects & Chimes
                </span>
                <span className="text-[10px] font-semibold text-[#6B635B] block">
                  Muted Velvet & Tactile Low-Pass Audio
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                onToggleSound();
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black border-[1.5px] border-[#24201D] transition-all cursor-pointer flex items-center gap-1.5 ${isSoundMuted
                  ? 'bg-stone-100 text-stone-500'
                  : 'bg-[#3D6B52] text-white shadow-2xs'
                }`}
            >
              {isSoundMuted ? (
                <span>Muted</span>
              ) : (
                <>
                  <span>Active</span>
                  <Volume2 className="w-3.5 h-3.5 stroke-[2.25]" />
                </>
              )}
            </button>
          </div>

          {/* Sound Preview Test Row */}
          {!isSoundMuted && (
            <div className="pt-2 border-t border-stone-100">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] block mb-1.5">
                Preview Muted Audio Suite
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => playClickSound()}
                  className="py-1.5 px-1 bg-[#FAF8F5] hover:bg-[#F4F0EA] border border-[#24201D] rounded-xl text-[10px] font-bold text-[#24201D] shadow-2xs active:translate-y-0.5 transition-all text-center cursor-pointer"
                  title="Test Muted Felt Tap"
                >
                  🪵 Tap
                </button>
                <button
                  type="button"
                  onClick={() => playTaskCheckSound()}
                  className="py-1.5 px-1 bg-[#DDE8DE] hover:bg-[#C9DCCB] border border-[#24201D] rounded-xl text-[10px] font-bold text-[#2D503C] shadow-2xs active:translate-y-0.5 transition-all text-center cursor-pointer"
                  title="Test Velvet Pop"
                >
                  🍵 Pop
                </button>
                <button
                  type="button"
                  onClick={() => playSuccessChime()}
                  className="py-1.5 px-1 bg-[#FBECCF] hover:bg-[#F7E2BB] border border-[#24201D] rounded-xl text-[10px] font-bold text-[#854D0E] shadow-2xs active:translate-y-0.5 transition-all text-center cursor-pointer"
                  title="Test Warm Felt Chord"
                >
                  ✨ Chime
                </button>
                <button
                  type="button"
                  onClick={() => playTimerFinishAlarm()}
                  className="py-1.5 px-1 bg-[#DEE8EF] hover:bg-[#C8DCE8] border border-[#24201D] rounded-xl text-[10px] font-bold text-[#476C85] shadow-2xs active:translate-y-0.5 transition-all text-center cursor-pointer"
                  title="Test Deep Mindful Gong"
                >
                  🔔 Gong
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Evening Debrief Toggle & Time Capsule */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] space-y-3 shadow-[2px_2px_0px_#24201D]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#F0BB58] border border-[#24201D] flex items-center justify-center text-xs shadow-2xs">
                <Moon className="w-4 h-4 text-[#24201D] stroke-[2.25]" />
              </div>
              <div>
                <span className="text-xs font-black font-display text-[#24201D] block">
                  Evening Debrief
                </span>
                <span className="text-[10px] font-semibold text-[#6B635B] block">
                  Daily wrap-up, score & task rollover
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleEveningDebrief}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black border-[1.5px] border-[#24201D] transition-all cursor-pointer ${
                eveningDebriefEnabled
                  ? 'bg-[#3D6B52] text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {eveningDebriefEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {eveningDebriefEnabled && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <span className="text-[10px] font-black uppercase text-[#6B635B]">
                Debrief Time
              </span>
              <div className="flex items-center gap-1.5">
                {['20:00', '21:00', '22:00', '23:00'].map((time) => (
                  <button
                    key={time}
                    onClick={() => handleChangeEveningTime(time)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono-num font-black transition-all cursor-pointer ${
                      eveningDebriefTime === time
                        ? 'bg-[#F0BB58] text-[#24201D] border-[#24201D] shadow-2xs'
                        : 'bg-[#FAF8F5] text-[#6B635B] border-stone-200 hover:border-[#24201D]'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Security & PIN Lock */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] space-y-3 shadow-[2px_2px_0px_#24201D]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center text-xs shadow-2xs">
                {pinConfigured ? (
                  <Lock className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
                ) : (
                  <Unlock className="w-4 h-4 text-stone-400 stroke-[2.25]" />
                )}
              </div>
              <div>
                <span className="text-xs font-black font-display text-[#24201D] block">
                  Security & PIN Lock
                </span>
                <span className="text-[10px] font-semibold text-[#6B635B] block">
                  {pinConfigured
                    ? bioActive
                      ? 'PIN + Biometrics Active'
                      : '4-digit PIN Active'
                    : 'Security disabled'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsSecurityModalOpen(true);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black border-[1.5px] border-[#24201D] transition-all cursor-pointer ${
                pinConfigured
                  ? 'bg-[#DDE8DE] text-[#2D503C] shadow-2xs'
                  : 'bg-[#F0BB58] text-[#24201D] shadow-2xs'
              }`}
            >
              {pinConfigured ? 'Configure' : 'Enable PIN'}
            </button>
          </div>

          {pinConfigured && (
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {bioActive ? (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#2D503C] bg-[#DDE8DE] px-2 py-0.5 rounded-md border border-[#24201D]">
                    <Fingerprint className="w-3 h-3" />
                    <span>Biometrics Active</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-stone-400">PIN Active</span>
                )}
              </div>

              {onLockApp && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onLockApp();
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] rounded-lg text-[10px] font-black text-[#24201D] flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                >
                  <Lock className="w-3 h-3 text-stone-700 stroke-[2.25]" />
                  <span>Lock App Now</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Theme & Accent Color Palette */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] space-y-2.5 shadow-[2px_2px_0px_#24201D]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#3D6B52] stroke-[2.25]" />
              <span className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Accent Colors
              </span>
            </div>
            <span className="text-[9px] font-extrabold uppercase text-[#6B635B]">
              Matcha & Paper
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {THEME_ACCENTS.map((accent) => (
              <button
                key={accent.id}
                onClick={() => {
                  playClickSound();
                  setSelectedAccent(accent.id);
                }}
                className={`py-2 px-1 rounded-2xl border-[1.5px] text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedAccent === accent.id
                    ? 'border-[#24201D] shadow-[2px_2px_0px_#24201D] scale-105'
                    : 'border-stone-200 hover:border-[#24201D]'
                }`}
                style={{ backgroundColor: accent.bg }}
              >
                <div className="w-3 h-3 rounded-full bg-[#24201D]/80 flex items-center justify-center">
                  {selectedAccent === accent.id && <Check className="w-2 h-2 text-white stroke-[3]" />}
                </div>
                <span className="text-[9px] font-black text-[#24201D] truncate max-w-full">
                  {accent.name.split(' ')[1] || accent.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Offline Database Vault & Backup */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] space-y-2.5 shadow-[2px_2px_0px_#24201D]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#3D6B52] stroke-[2.25]" />
              <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Offline Data Vault
              </h4>
            </div>
            <span className="text-[9px] font-black text-[#2D503C] bg-[#DDE8DE] px-2 py-0.5 rounded-full border border-[#24201D] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>100% Offline</span>
            </span>
          </div>

          <p className="text-[11px] font-medium text-[#6B635B] leading-relaxed">
            All tasks, habits, streak records, and focus logs are stored locally in your browser IndexedDB.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 rounded-full bg-[#DDE8DE] hover:bg-[#CADBCF] border-[1.5px] border-[#24201D] text-xs font-black text-[#24201D] flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleImportClick}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 rounded-full bg-[#FAF8F5] hover:bg-stone-100 border-[1.5px] border-[#24201D] text-xs font-black text-[#24201D] flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>Import JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={handleResetDemo}
              disabled={isProcessing}
              className="w-full py-1.5 rounded-full bg-[#F7E3DC] hover:bg-[#F0D0C5] border-[1.5px] border-[#24201D] text-[10px] font-black text-[#C25E40] flex items-center justify-center gap-1 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.25]" />
              <span>Reset & Reload Sample Data</span>
            </button>
          </div>
        </div>

        {/* 4. App Version & Official Updater */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F0BB58] border border-[#24201D] flex items-center justify-center font-bold text-xs shadow-xs">
                <Zap className="w-4 h-4 text-[#24201D] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                  Daily Sumire
                </h4>
                <span className="text-[10px] text-[#6B635B] font-bold">Version {CURRENT_APP_VERSION}</span>
              </div>
            </div>

            <button
              onClick={handleCheckAppUpdate}
              disabled={updateChecking}
              className="px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#DDE8DE] border border-[#24201D] text-[10px] font-black text-[#24201D] flex items-center gap-1.5 shadow-2xs cursor-pointer active:translate-y-0.5 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${updateChecking ? 'animate-spin text-[#3D6B52]' : ''}`} />
              <span>{updateChecking ? 'Checking...' : 'Check Updates'}</span>
            </button>
          </div>

          {updateStatus && (
            <div className="p-2 bg-[#DDE8DE] border border-[#24201D]/20 rounded-xl text-[10px] font-bold text-[#2D503C] text-center">
              {updateStatus}
            </div>
          )}
        </div>

        {/* Security PIN / Biometrics Setup Modal */}
        <SecuritySetupModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          onSecurityUpdated={handleRefreshSecurityState}
        />
      </div>
    </div>
  );
};
