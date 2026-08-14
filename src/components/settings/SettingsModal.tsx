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
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import {
  exportDatabaseToJson,
  downloadBackupFile,
  importDatabaseFromJson,
  resetAndSeedDatabase,
} from '../../lib/exportImport';
import { playSuccessChime, playClickSound } from '../../lib/sound';
import type { UserProfile } from '../auth/AuthContainer';

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
}) => {
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState('lilac');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            className={`p-3 rounded-2xl border-[1.75px] flex items-center gap-2.5 text-xs font-bold ${
              feedback.success
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

        {/* 2. Audio & Haptic Feedback Capsule */}
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-black border-[1.5px] border-[#18181B] transition-all cursor-pointer ${
              isSoundMuted
                ? 'bg-slate-100 text-slate-500'
                : 'bg-[#BEF264] text-[#18181B] shadow-2xs'
            }`}
          >
            {isSoundMuted ? 'Muted' : 'Active 🔊'}
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
                className={`py-2 px-1 rounded-2xl border-[1.5px] text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedAccent === accent.id
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

      </div>
    </div>
  );
};
