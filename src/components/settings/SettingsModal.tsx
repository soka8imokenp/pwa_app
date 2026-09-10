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
  Apple,
  Languages,
  Globe,
  ChevronRight,
  Check,
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
import { db } from '../../lib/db';
import { SecuritySetupModal } from '../security/SecuritySetupModal';
import { PrivacyPolicyModal } from '../modals/PrivacyPolicyModal';
import { TermsOfServiceModal } from '../modals/TermsOfServiceModal';
import { useTranslation } from '../../i18n/LanguageContext';
export interface InterfaceLanguageOption {
  code: Language;
  name: string;
  description: string;
  tag: string;
}

export const INTERFACE_LANGUAGES: InterfaceLanguageOption[] = [
  {
    code: 'uz',
    name: 'Oʻzbekcha',
    description: 'Oʻzbek tili (Lotin alifbosi)',
    tag: 'UZ',
  },
  {
    code: 'ru',
    name: 'Русский',
    description: 'Русский язык',
    tag: 'RU',
  },
  {
    code: 'en',
    name: 'English',
    description: 'International English',
    tag: 'EN',
  },
];

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
  appMode?: 'planner' | 'health';
  onChangeAppMode?: (mode: 'planner' | 'health') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isSoundMuted,
  onToggleSound,
  onDataChanged,
  onShowUpdateModal,
  appMode = 'planner',
  onChangeAppMode,
}) => {
  const { t, language, setLanguage } = useTranslation();
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
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
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

  // Legal & GDPR modals
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectLanguage = (newLang: Language) => {
    playClickSound();
    setLanguage(newLang);
    playSuccessChime();
    setFeedback({
      text:
        newLang === 'uz'
          ? 'Tizim tili Oʻzbekcha (Lotin)ga oʻzgartirildi!'
          : newLang === 'ru'
          ? 'Язык системы изменен на Русский!'
          : 'System language set to English!',
      success: true,
    });
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleDeleteAllData = async () => {
    const confirmation = window.prompt(t('settings.dangerPrompt'));
    if (confirmation === 'DELETE') {
      setIsProcessing(true);
      try {
        await db.delete();
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      } catch (err: any) {
        setFeedback({ text: t('common.error') + ': ' + err.message, success: false });
        setIsProcessing(false);
      }
    }
  };

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
    setFeedback({ text: `${t('settings.voiceLangTitle')}: ${lang.toUpperCase()}`, success: true });
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleSaveGeminiKey = () => {
    playClickSound();
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_gemini_api_key', geminiKeyInput.trim());
      playSuccessChime();
      setFeedback({ text: t('settings.geminiSavedFeedback'), success: true });
      setTimeout(() => setFeedback(null), 2500);
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
        setUpdateStatus(`${t('settings.latestVersion')} (${CURRENT_APP_VERSION})`);
      } else {
        setUpdateStatus(t('common.error'));
      }
    } catch {
      setUpdateStatus(t('common.error'));
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
      setFeedback({ text: t('common.success'), success: true });
      setTimeout(() => setFeedback(null), 2500);
    } catch (e: any) {
      setFeedback({ text: t('common.error'), success: false });
    } finally {
      setIsProcessing(false);
    }
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
            setFeedback({ text: t('common.success'), success: true });
            onDataChanged();
          } else {
            setFeedback({ text: res.message, success: false });
          }
        }
      };
      reader.readAsText(file);
    } catch (e: any) {
      setFeedback({ text: t('common.error'), success: false });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm(t('settings.resetConfirm'))) {
      playClickSound();
      setIsProcessing(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kairo_health_onboarded');
        localStorage.removeItem('kairo_clinical_health_summary');
      }
      await resetAndSeedDatabase();
      playSuccessChime();
      setFeedback({ text: t('common.success'), success: true });
      setTimeout(() => {
        window.location.reload();
      }, 450);
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
                {t('settings.title')}
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                {t('settings.subtitle')}
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

        {/* 0. Language Switcher Capsule */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] space-y-2.5 shadow-[2px_2px_0px_#24201D]">
          <div>
            <span className="text-xs font-black font-display text-[#24201D] block">
              {t('settings.languageTitle')}
            </span>
            <span className="text-[10px] font-semibold text-[#6B635B] block">
              {t('settings.languageDesc')}
            </span>
          </div>

          {/* Tactile trigger to open popup selection modal */}
          {(() => {
            const currentLang = INTERFACE_LANGUAGES.find((l) => l.code === language);
            return (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsLanguageModalOpen(true);
                }}
                className="w-full p-3 bg-[#FAF8F5] hover:bg-[#F4EFEA] border-[1.75px] border-[#24201D] rounded-2xl flex items-center justify-between shadow-[1.5px_1.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="w-8 h-8 rounded-xl bg-[#3D6B52] text-white font-black font-display text-xs border border-[#24201D] flex items-center justify-center shadow-2xs">
                    {currentLang?.tag || language.toUpperCase()}
                  </span>
                  <div>
                    <span className="text-xs font-black font-display text-[#24201D] block leading-tight">
                      {currentLang?.name || language}
                    </span>
                    <span className="text-[10px] font-medium text-[#6B635B] block">
                      {currentLang?.description || ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#24201D] text-[10px] font-black uppercase tracking-wider text-[#2D503C] shadow-2xs group-hover:bg-[#3D6B52] group-hover:text-white transition-colors font-display">
                  <span>{language === 'ru' ? 'Выбрать' : language === 'uz' ? 'Oʻzgartirish' : 'Change'}</span>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </button>
            );
          })()}
        </div>

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
                  {t('settings.soundTitle')}
                </span>
                <span className="text-[10px] font-semibold text-[#6B635B] block">
                  {t('settings.soundDesc')}
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
                <span>{t('common.muted')}</span>
              ) : (
                <>
                  <span>{t('common.active')}</span>
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
                  {t('settings.securityTitle')}
                </span>
                <span className="text-[10px] font-semibold text-[#6B635B] block">
                  {pinConfigured ? t('settings.securityActive') : t('settings.securityDisabled')}
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
              {pinConfigured ? t('settings.securityBtnConfigure') : t('settings.securityBtnEnable')}
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
                {t('settings.geminiTitle')}
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
                  placeholder={t('settings.geminiPlaceholder')}
                  className="w-full pl-8 pr-3 py-2 bg-[#F4F0EA] border border-[#24201D] rounded-xl text-xs font-mono outline-none text-[#24201D]"
                />
                <Key className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              </div>

              <button
                type="button"
                onClick={handleSaveGeminiKey}
                className="px-3.5 py-2 bg-[#3D6B52] hover:bg-[#345B45] border border-[#24201D] rounded-xl text-xs font-black text-white shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0"
              >
                {t('settings.geminiSave')}
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setShowKeyText(!showKeyText)}
                className="text-[10px] font-bold text-[#6B635B] hover:text-[#24201D] cursor-pointer"
              >
                {showKeyText ? t('settings.geminiHide') : t('settings.geminiShow')}
              </button>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-[#3D6B52] hover:underline flex items-center gap-1"
              >
                <span>{t('settings.geminiGetFreeKey')}</span>
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
                {t('settings.voiceLangTitle')}
              </span>
              <span className="text-[10px] font-semibold text-[#6B635B] block">
                {t('settings.voiceLangDesc')}
              </span>
            </div>
          </div>

          {/* Sleek Segmented Switcher */}
          <div className="p-1 bg-[#F4F0EA] border border-[#24201D]/30 rounded-2xl flex items-center gap-1">
            {VOICE_LANGUAGES.map((v) => {
              const isSelected = voiceLang === v.id;
              const shortLabel =
                v.id === 'auto'
                  ? 'Auto'
                  : v.id === 'uz-UZ'
                  ? 'UZ'
                  : v.id === 'ru-RU'
                  ? 'RU'
                  : v.id === 'en-US'
                  ? 'EN'
                  : 'JP';
              const fullLabel =
                v.id === 'auto'
                  ? 'Multi'
                  : v.id === 'uz-UZ'
                  ? 'Oʻzbek'
                  : v.id === 'ru-RU'
                  ? 'Русский'
                  : v.id === 'en-US'
                  ? 'English'
                  : '日本語';

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
                  {t('settings.eveningDebriefTitle')}
                </span>
                <span className="text-[10px] font-semibold text-[#6B635B] block">
                  {t('settings.eveningDebriefDesc')}
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
              {eveningDebriefEnabled ? t('common.enabled') : t('common.disabled')}
            </button>
          </div>

          {eveningDebriefEnabled && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <span className="text-[10px] font-black uppercase text-[#6B635B]">
                {t('settings.eveningDebriefTime')}
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

        {/* 6. Offline Database Vault & Backup */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-[2rem] space-y-2.5 shadow-[2px_2px_0px_#24201D]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#3D6B52] stroke-[2.25]" />
            <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
              {t('settings.offlineVaultTitle')}
            </h4>
          </div>

          <p className="text-[11px] font-medium text-[#6B635B] leading-relaxed">
            {t('settings.offlineVaultDesc')}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 rounded-xl bg-[#DDE8DE] hover:bg-[#CADBCF] border-[1.5px] border-[#24201D] text-xs font-black text-[#24201D] flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>{t('settings.exportJson')}</span>
            </button>

            <label
              onClick={() => playClickSound()}
              className={`flex-1 py-2 px-3 rounded-xl bg-[#F4F0EA] hover:bg-stone-200 border-[1.5px] border-[#24201D] text-xs font-black text-[#24201D] flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all ${
                isProcessing ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>{t('settings.importJson')}</span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
                disabled={isProcessing}
              />
            </label>

            <button
              onClick={handleResetDemo}
              disabled={isProcessing}
              className="w-full py-1.5 rounded-xl bg-[#F7E3DC] hover:bg-[#F0D0C5] border border-[#24201D] text-[10px] font-black text-[#C25E40] flex items-center justify-center gap-1 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.25]" />
              <span>{t('settings.resetDemo')}</span>
            </button>
          </div>

          {/* Legal Compliance Links */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-center gap-4 text-[10px] font-bold text-[#6B635B]">
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="underline hover:text-[#24201D] cursor-pointer"
            >
              {t('settings.privacyPolicy')}
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsTermsModalOpen(true)}
              className="underline hover:text-[#24201D] cursor-pointer"
            >
              {t('settings.termsOfService')}
            </button>
          </div>
        </div>

        {/* 7. Version & App Update Capsule */}
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
                {t('settings.releaseBuild')}
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
            <span>{updateChecking ? t('settings.checking') : t('settings.checkUpdates')}</span>
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

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />

      {/* Pop-up Language Selection Panel (Extensible list without emoji icons) */}
      {isLanguageModalOpen && (
        <div
          className="fixed inset-0 z-[120] bg-[#24201D]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsLanguageModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#FAF8F5] border-[2px] border-[#24201D] rounded-3xl shadow-[5px_5px_0px_#24201D] p-5 space-y-4 font-body select-none animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b-[1.75px] border-[#24201D]/15">
              <div>
                <h3 className="text-base font-black font-display text-[#24201D] leading-tight">
                  {t('settings.languageTitle')}
                </h3>
                <p className="text-[10px] font-bold text-[#6B635B] mt-0.5">
                  {language === 'ru'
                    ? 'Выберите язык интерфейса приложения'
                    : language === 'uz'
                    ? 'Ilova interfeysi tilini tanlang'
                    : 'Choose your preferred application language'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsLanguageModalOpen(false);
                }}
                className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 border-[1.5px] border-[#24201D] shadow-[1.5px_1.5px_0px_#24201D] flex items-center justify-center text-[#6B635B] hover:text-[#24201D] cursor-pointer active:translate-y-0.5 transition-all"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* List of Languages (Clean typography, no emoji icons, easily extensible) */}
            <div className="space-y-2">
              {INTERFACE_LANGUAGES.map((item) => {
                const isSelected = language === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      handleSelectLanguage(item.code);
                      setIsLanguageModalOpen(false);
                    }}
                    className={`w-full p-3 rounded-2xl border-[1.75px] border-[#24201D] flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#3D6B52] text-white shadow-[2.5px_2.5px_0px_#24201D] -translate-y-0.5'
                        : 'bg-white hover:bg-[#F4F0EA] text-[#24201D] shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 active:shadow-none'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black font-display border border-[#24201D] shadow-2xs ${
                          isSelected
                            ? 'bg-white text-[#2D503C]'
                            : 'bg-[#F4F0EA] text-[#24201D]'
                        }`}
                      >
                        {item.tag}
                      </span>
                      <div>
                        <span
                          className={`text-sm font-black font-display block leading-tight ${
                            isSelected ? 'text-white' : 'text-[#24201D]'
                          }`}
                        >
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] font-medium block ${
                            isSelected ? 'text-[#DDE8DE]' : 'text-[#6B635B]'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 border border-white/40 text-[9px] font-black uppercase tracking-wider text-white font-display">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>{language === 'ru' ? 'Активен' : language === 'uz' ? 'Faol' : 'Active'}</span>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-[1.5px] border-[#24201D]/30" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Notice */}
            <div className="pt-2 text-center">
              <span className="text-[10px] font-medium text-stone-400">
                {language === 'ru'
                  ? 'Язык применится мгновенно ко всем модулям'
                  : language === 'uz'
                  ? 'Til barcha modullar uchun darhol qoʻllanadi'
                  : 'Language will apply instantly across all modules'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
