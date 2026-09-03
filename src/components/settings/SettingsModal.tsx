import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Download,
  Upload,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Database,
  RotateCcw,
  X,
  Key,
  Bot,
  ExternalLink,
  RefreshCw,
  Moon,
  Lock,
  Unlock,
  Mic,
  ArrowUpCircle,
} from 'lucide-react';
import {
  exportDatabaseToJson,
  downloadBackupFile,
  importDatabaseFromJson,
  resetAndSeedDatabase,
} from '../../lib/exportImport';
import {
  getVoiceLanguage,
  setVoiceLanguage,
  VOICE_LANGUAGES,
  VoiceLanguage,
} from '../../lib/speechRecognition';
import {
  playSuccessChime,
  playClickSound,
} from '../../lib/sound';
import { checkForAppUpdate, CURRENT_APP_VERSION, AppUpdateInfo } from '../../lib/appUpdater';
import {
  isPinSet,
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
  onShowUpdateModal?: (info: AppUpdateInfo) => void;
  onLockApp?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isSoundMuted,
  onToggleSound,
  onDataChanged,
  onShowUpdateModal,
}) => {
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_gemini_api_key') || '';
    }
    return '';
  });
  const [showKeyText, setShowKeyText] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [pinConfigured, setPinConfigured] = useState(false);

  // Evening Debrief settings state
  const [eveningDebriefEnabled, setEveningDebriefEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_evening_debrief_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [eveningDebriefTime, setEveningDebriefTime] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_evening_debrief_time') || '21:00';
    }
    return '21:00';
  });

  // Check for app update states
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPinConfigured(isPinSet());
    }
  }, [isOpen, isSecurityModalOpen]);

  const handleToggleEveningDebrief = () => {
    playClickSound();
    const next = !eveningDebriefEnabled;
    setEveningDebriefEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_evening_debrief_enabled', String(next));
    }
  };

  const handleChangeEveningTime = (timeStr: string) => {
    playClickSound();
    setEveningDebriefTime(timeStr);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_evening_debrief_time', timeStr);
    }
  };

  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(() => getVoiceLanguage());

  const handleSelectVoiceLang = (lang: VoiceLanguage) => {
    playClickSound();
    setVoiceLang(lang);
    setVoiceLanguage(lang);
    playSuccessChime();
    setFeedback({ text: `Voice language set to ${lang.toUpperCase()}!`, success: true });
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleSaveGeminiKey = () => {
    playClickSound();
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_gemini_api_key', geminiKeyInput.trim());
      playSuccessChime();
      setFeedback({ text: 'Gemini API key saved successfully!', success: true });
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
        setUpdateStatus('Could not reach update server. Check your connection.');
      }
    } catch {
      setUpdateStatus('Could not reach update server.');
    } finally {
      setUpdateChecking(false);
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
    if (window.confirm('Reset database and reload sample tasks & habits?')) {
      playClickSound();
      setIsProcessing(true);
      await resetAndSeedDatabase();
      playSuccessChime();
      setFeedback({ text: 'Demo data loaded successfully!', success: true });
      onDataChanged();
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DDE8DE] border-[1.5px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <Settings className="w-4.5 h-4.5 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                App Settings
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Audio, Security & Offline Vault
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
          <div
            className={`p-3 rounded-2xl border-[1.75px] flex items-center gap-2.5 text-xs font-bold ${
              feedback.success
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

        {/* 1. Audio Feedback Capsule */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] shadow-[2px_2px_0px_#24201D]">
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
                  Sound Effects
                </span>
                <span className="text-[10px] font-semibold text-[#6B635B] block">
                  Tactile feedback audio
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                onToggleSound();
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black border-[1.5px] border-[#24201D] transition-all cursor-pointer flex items-center gap-1.5 ${
                isSoundMuted
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
        </div>

        {/* 2. Security & PIN Lock */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] shadow-[2px_2px_0px_#24201D]">
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
                  {pinConfigured ? 'PIN Protection Active' : 'Security disabled'}
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
        </div>

        {/* 3. Gemini AI API Key Capsule */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Gemini AI API Key
              </h4>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder="Paste API key from Google AI Studio..."
                  className="w-full pl-8 pr-3 py-2 bg-[#F4F0EA] border border-[#24201D] rounded-xl text-xs font-mono outline-none text-[#24201D]"
                />
                <Key className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              </div>

              <button
                type="button"
                onClick={handleSaveGeminiKey}
                className="px-3.5 py-2 bg-[#3D6B52] hover:bg-[#345B45] border border-[#24201D] rounded-xl text-xs font-black text-white shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0"
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

        {/* 4. Voice Dictation Language Capsule */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] space-y-2.5 shadow-[2px_2px_0px_#24201D]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FBECCF] border border-[#24201D] flex items-center justify-center text-xs shadow-2xs shrink-0">
              <Mic className="w-4 h-4 text-[#854D0E] stroke-[2.25]" />
            </div>
            <div>
              <span className="text-xs font-black font-display text-[#24201D] block">
                Voice Language
              </span>
              <span className="text-[10px] font-semibold text-[#6B635B] block">
                Bilingual recognition & dictation
              </span>
            </div>
          </div>

          {/* Sleek Segmented Switcher */}
          <div className="p-1 bg-[#F4F0EA] border border-[#24201D]/30 rounded-2xl flex items-center gap-1">
            {VOICE_LANGUAGES.map((v) => {
              const isSelected = voiceLang === v.id;
              const shortLabel = v.id === 'auto' ? 'Auto' : v.id === 'ru-RU' ? 'RU' : v.id === 'en-US' ? 'EN' : 'JP';
              const fullLabel = v.id === 'auto' ? 'Bilingual' : v.id === 'ru-RU' ? 'Русский' : v.id === 'en-US' ? 'English' : '日本語';

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectVoiceLang(v.id)}
                  title={v.label}
                  className={`flex-1 py-1.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-[#3D6B52] text-white border border-[#24201D] shadow-2xs'
                      : 'text-[#6B635B] hover:text-[#24201D] hover:bg-white/60'
                  }`}
                >
                  <span className="text-[11px] font-bold leading-tight">{shortLabel}</span>
                  <span className={`text-[8px] font-medium leading-tight ${isSelected ? 'text-white/80' : 'text-[#8A8175]'}`}>
                    {fullLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Evening Debrief Toggle & Time Capsule */}
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
                Time
              </span>
              <div className="flex items-center gap-1.5">
                {['20:00', '21:00', '22:00', '23:00'].map((time) => (
                  <button
                    key={time}
                    onClick={() => handleChangeEveningTime(time)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono-num font-black transition-all cursor-pointer ${
                      eveningDebriefTime === time
                        ? 'bg-[#F0BB58] text-[#24201D] border-[#24201D] shadow-2xs'
                        : 'bg-[#F4F0EA] text-[#6B635B] border-stone-200 hover:border-[#24201D]'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. Offline Database Vault & Backup */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] space-y-2.5 shadow-[2px_2px_0px_#24201D]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#3D6B52] stroke-[2.25]" />
            <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
              Offline Data Vault
            </h4>
          </div>

          <p className="text-[11px] font-medium text-[#6B635B] leading-relaxed">
            All tasks, habits, streak records, and focus logs are stored locally in your device IndexedDB.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 rounded-xl bg-[#DDE8DE] hover:bg-[#CADBCF] border-[1.5px] border-[#24201D] text-xs font-black text-[#24201D] flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleImportClick}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 rounded-xl bg-[#F4F0EA] hover:bg-stone-200 border-[1.5px] border-[#24201D] text-xs font-black text-[#24201D] flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
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
              className="w-full py-1.5 rounded-xl bg-[#F7E3DC] hover:bg-[#F0D0C5] border border-[#24201D] text-[10px] font-black text-[#C25E40] flex items-center justify-center gap-1 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.25]" />
              <span>Reset & Reload Sample Data</span>
            </button>
          </div>
        </div>

        {/* 6. Version & App Update Capsule */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] shadow-[2px_2px_0px_#24201D] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center text-xs shadow-2xs shrink-0">
              <ArrowUpCircle className="w-4.5 h-4.5 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black font-mono-num text-[#24201D] block">
                {CURRENT_APP_VERSION.replace(/^v+/, 'v')}
              </span>
              <span className="text-[10px] font-semibold text-[#6B635B] block">
                Release build
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckAppUpdate}
            disabled={updateChecking}
            className="px-3.5 py-2 bg-[#3D6B52] hover:bg-[#345B45] text-white disabled:opacity-50 border-[1.5px] border-[#24201D] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_#24201D] active:translate-y-0.5 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updateChecking ? 'animate-spin' : ''}`} />
            <span>{updateChecking ? 'Checking...' : 'Check Updates'}</span>
          </button>
        </div>

        {updateStatus && (
          <p className="text-[10px] font-bold text-center text-[#2D503C] bg-[#DDE8DE] p-2.5 rounded-xl border border-[#24201D] shadow-2xs animate-in fade-in">
            {updateStatus}
          </p>
        )}

      </div>

      {/* Security Setup Modal */}
      {isSecurityModalOpen && (
        <SecuritySetupModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          onSecurityUpdated={() => {
            setPinConfigured(isPinSet());
          }}
        />
      )}
    </div>
  );
};
