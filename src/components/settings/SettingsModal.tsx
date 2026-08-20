import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import {
  exportDatabaseToJson,
  downloadBackupFile,
  importDatabaseFromJson,
  resetAndSeedDatabase,
} from '../../lib/exportImport';
import { playSuccessChime, playClickSound } from '../../lib/sound';
import { AVATAR_OPTIONS, getAvatarById } from '../../data/avatars';
import type { UserProfile } from '../auth/AuthContainer';
import { checkForAppUpdate, CURRENT_APP_VERSION, AppUpdateInfo } from '../../lib/appUpdater';

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
}) => {
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState('lilac');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#E9D5FF] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs">
              <Settings className="w-5 h-5 text-purple-950 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#18181B]">
                Settings & Profile
              </h3>
              <p className="text-[10px] font-semibold text-slate-500">
                Preferences, audio & offline backup
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-slate-600 hover:text-[#18181B] cursor-pointer shadow-2xs active:scale-95"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl border-[1.75px] flex items-center gap-2.5 text-xs font-bold ${feedback.success
                ? 'bg-[#ECFCCB] text-lime-950 border-[#18181B] shadow-2xs'
                : 'bg-[#FFE4E6] text-rose-950 border-[#18181B] shadow-2xs'
              }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-lime-700 stroke-[2.5] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 stroke-[2.5] shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* 1. User Profile Account Capsule */}
        {currentUser && (
          <div className="p-3.5 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-[2rem] flex items-center justify-between shadow-[2px_2px_0px_#18181B]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#E9D5FF] via-[#F3E8FF] to-[#C084FC] border-[1.5px] border-[#18181B] flex items-center justify-center text-lg shadow-2xs shrink-0">
                <User className="w-5 h-5 text-purple-950 stroke-[2.25]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black font-display text-[#18181B] truncate">
                  {currentUser.firstName} {currentUser.lastName}
                </h4>
                <p className="text-[10px] font-bold text-slate-400 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogoutClick}
              className="px-3 py-1.5 rounded-full bg-[#FFE4E6] hover:bg-rose-200 border-[1.5px] border-[#18181B] text-[11px] font-black text-rose-950 flex items-center gap-1.5 shadow-2xs cursor-pointer active:translate-y-0.5 shrink-0 transition-all"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* 2. Funny Vector Mascot Avatars Grid */}
        <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFE873] border border-[#18181B] flex items-center justify-center shadow-xs">
                <Smile className="w-4 h-4 text-[#18181B] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                  Mascot Avatar
                </h4>
                <p className="text-[10px] text-slate-500 font-bold">
                  Funny vector character avatars
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-purple-800 bg-[#E8DCFF] px-2 py-0.5 rounded-full border border-[#18181B]">
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
                      ? 'border-[#18181B] shadow-[2px_2px_0px_#18181B] scale-105 ring-2 ring-[#FFE873]'
                      : 'border-slate-200 hover:border-[#18181B] opacity-80 hover:opacity-100'
                    }`}
                  style={{ backgroundColor: avatar.bg }}
                  title={avatar.name}
                >
                  <div className="w-10 h-10">
                    {avatar.renderSvg('w-full h-full')}
                  </div>
                  <span className="text-[9px] font-black text-[#18181B] truncate w-full text-center leading-tight">
                    {avatar.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Gemini AI API Key Capsule */}
        <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E8DCFF] border border-[#18181B] flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4 text-purple-950 stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                  Gemini AI API Key
                </h4>
                <p className="text-[10px] text-slate-500 font-bold">
                  Model: gemini-3.5-flash-lite
                </p>
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#18181B] ${
              geminiKeyInput.trim()
                ? 'bg-[#D1FBE4] text-[#065F46]'
                : 'bg-[#FEF08A] text-amber-900'
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
                  placeholder="Вставьте ключ из Google AI Studio..."
                  className="w-full pl-8 pr-3 py-2 bg-[#FAF7F2] border-[1.5px] border-[#18181B] rounded-xl text-xs font-mono outline-none text-[#18181B]"
                />
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <button
                type="button"
                onClick={handleSaveGeminiKey}
                className="px-3.5 py-2 bg-[#BEF264] hover:bg-lime-300 border-[1.5px] border-[#18181B] rounded-xl text-xs font-black text-[#18181B] shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0"
              >
                Save
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setShowKeyText(!showKeyText)}
                className="text-[10px] font-bold text-slate-500 hover:text-[#18181B] cursor-pointer"
              >
                {showKeyText ? 'Скрыть символы' : 'Показать ключ'}
              </button>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-purple-700 hover:underline flex items-center gap-1"
              >
                <span>Получить бесплатный ключ</span>
                <ExternalLink className="w-3 h-3 stroke-[2.25]" />
              </a>
            </div>
          </div>
        </div>

        {/* 4. Audio & Haptic Feedback Capsule */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-[2rem] flex items-center justify-between shadow-[2px_2px_0px_#18181B]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#E9D5FF] border border-[#18181B] flex items-center justify-center text-xs">
              {isSoundMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400 stroke-[2.25]" />
              ) : (
                <Volume2 className="w-4 h-4 text-purple-900 stroke-[2.25]" />
              )}
            </div>
            <div>
              <span className="text-xs font-black font-display text-[#18181B] block">
                Sound Effects & Chimes
              </span>
              <span className="text-[10px] font-semibold text-slate-400 block">
                Web Audio synthesizer & completion haptics
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onToggleSound();
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black border-[1.5px] border-[#18181B] transition-all cursor-pointer flex items-center gap-1.5 ${isSoundMuted
                ? 'bg-slate-100 text-slate-500'
                : 'bg-[#BEF264] text-[#18181B] shadow-2xs'
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

        {/* 3. Theme & Accent Color Palette */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-[2rem] space-y-2.5 shadow-[2px_2px_0px_#18181B]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-800 stroke-[2.25]" />
              <span className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                Accent Colors
              </span>
            </div>
            <span className="text-[9px] font-extrabold uppercase text-slate-400">
              Soft Brutalism
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
                className={`py-2 px-1 rounded-2xl border-[1.5px] text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${selectedAccent === accent.id
                    ? 'border-[#18181B] shadow-[2px_2px_0px_#18181B] scale-105'
                    : 'border-slate-200 hover:border-[#18181B]'
                  }`}
                style={{ backgroundColor: accent.bg }}
              >
                <div className="w-3 h-3 rounded-full bg-[#18181B]/80 flex items-center justify-center">
                  {selectedAccent === accent.id && <Check className="w-2 h-2 text-white stroke-[3]" />}
                </div>
                <span className="text-[9px] font-black text-[#18181B] truncate max-w-full">
                  {accent.name.split(' ')[1] || accent.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Offline Database Vault & Backup */}
        <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-[2rem] space-y-2.5 shadow-[2px_2px_0px_#18181B]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-800 stroke-[2.25]" />
              <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                Offline Data Vault
              </h4>
            </div>
            <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>100% Offline</span>
            </span>
          </div>

          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
            All tasks, habits, streak records, and focus logs are stored locally in your browser IndexedDB.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 rounded-full bg-[#E9D5FF] hover:bg-[#D8B4FE] border-[1.5px] border-[#18181B] text-xs font-black text-[#18181B] flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleImportClick}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 rounded-full bg-[#FAF7F2] hover:bg-slate-100 border-[1.5px] border-[#18181B] text-xs font-black text-[#18181B] flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
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
              className="w-full py-1.5 rounded-full bg-[#FED7AA] hover:bg-[#FDBA74] border-[1.5px] border-[#18181B] text-[10px] font-black text-[#18181B] flex items-center justify-center gap-1 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.25]" />
              <span>Reset & Reload Sample Data</span>
            </button>
          </div>
        </div>

        {/* 4. App Version & Official Updater */}
        <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FFE873] border border-[#18181B] flex items-center justify-center font-bold text-xs shadow-xs">
                <Zap className="w-4 h-4 text-[#18181B] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                  Daily Sumire
                </h4>
                <span className="text-[10px] text-slate-500 font-bold">Version {CURRENT_APP_VERSION}</span>
              </div>
            </div>

            <button
              onClick={handleCheckAppUpdate}
              disabled={updateChecking}
              className="px-3 py-1.5 rounded-full bg-[#FAF7F2] hover:bg-[#E8DCFF] border border-[#18181B] text-[10px] font-black text-[#18181B] flex items-center gap-1.5 shadow-2xs cursor-pointer active:translate-y-0.5 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${updateChecking ? 'animate-spin' : ''}`} />
              <span>{updateChecking ? 'Checking...' : 'Check Updates'}</span>
            </button>
          </div>

          {updateStatus && (
            <div className="p-2 bg-[#D1FBE4] border border-[#065F46]/30 rounded-xl text-[10px] font-bold text-[#065F46] text-center">
              {updateStatus}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
