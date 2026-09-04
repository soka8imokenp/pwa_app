import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  Utensils,
  Plus,
  Droplets,
  Scale,
  Dumbbell,
  CheckSquare,
} from 'lucide-react';
import {
  askSumireAI,
  AIChatMessage,
  logMealDirectly,
  EstimatedMealResult,
} from '../../lib/aiService';
import { compressImageFile } from '../../lib/imageCompression';
import {
  startVoiceDictation,
  stopVoiceDictation,
  isSpeechRecognitionSupported,
  getVoiceLanguage,
  setVoiceLanguage,
  getVoiceLanguageBadge,
  VoiceLanguage,
} from '../../lib/speechRecognition';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface SumireCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const SumireCompanionModal: React.FC<SumireCompanionModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Привет! Я Сумирэ — помогу распределить задачи, проанализировать еду по фото или внести любые записи в твой дневник питания и трекеры.",
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(() => getVoiceLanguage());

  const cycleVoiceLang = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playClickSound();
    const order: VoiceLanguage[] = ['auto', 'ru-RU', 'en-US', 'ja-JP'];
    const nextIdx = (order.indexOf(voiceLang) + 1) % order.length;
    const nextLang = order[nextIdx];
    setVoiceLang(nextLang);
    setVoiceLanguage(nextLang);
  };
  const [attachedImage, setAttachedImage] = useState<{ base64Data: string; mimeType: string; previewUrl: string } | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    playClickSound();
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: "История очищена. Чем могу помочь?",
        timestamp: Date.now(),
      },
    ]);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1024, 0.8);
      setAttachedImage(compressed);
      playClickSound();
    } catch (err) {
      console.error('Image compression failed:', err);
    }
    e.target.value = '';
  };

  const handleLogSuggestedMeal = async (meal: EstimatedMealResult, msgId: string) => {
    playClickSound();
    await logMealDirectly(meal);
    playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
    if (onDataChanged) {
      onDataChanged();
    }
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const actionDesc = `Внесено в рацион (${meal.mealType}): ${meal.name} (${meal.kcal} ккал, Б:${meal.proteinGrams}г, Ж:${meal.fatGrams}г, У:${meal.carbsGrams}г)`;
          const existingActions = m.executedActions || [];
          return {
            ...m,
            suggestedMeal: undefined,
            executedActions: [
              ...existingActions,
              {
                type: 'log_meal' as const,
                description: actionDesc,
                details: meal,
              },
            ],
          };
        }
        return m;
      })
    );
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if ((!text && !attachedImage) || isLoading) return;

    playClickSound();
    const currentAttachment = attachedImage;

    const userMsg: AIChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text || 'Оцени это фото/блюдо:',
      imagePreview: currentAttachment?.previewUrl,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const response = await askSumireAI(
        text,
        messages,
        currentAttachment ? { base64Data: currentAttachment.base64Data, mimeType: currentAttachment.mimeType } : undefined
      );

      const assistantMsg: AIChatMessage = {
        id: `sumire_${Date.now()}`,
        role: 'assistant',
        content: response.replyText,
        timestamp: Date.now(),
        executedActions: response.executedActions,
        suggestedMeal: response.suggestedMeal,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      playSuccessChime();

      if (response.executedActions && response.executedActions.length > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
        });
        if (onDataChanged) {
          onDataChanged();
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `${err.message || 'Не удалось связаться с сервисом.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Голосовой ввод не поддерживается данным браузером или устройством.');
      return;
    }

    if (isRecording) {
      stopVoiceDictation();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      startVoiceDictation(
        {
          onTranscript: (transcript: string) => {
            setInputText(transcript);
          },
          onError: (err: string) => {
            console.error(err);
            setIsRecording(false);
          },
          onEnd: () => {
            setIsRecording(false);
          },
        },
        {
          lang: voiceLang,
          continuous: true,
          autoPunctuate: true,
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-white border-2 border-[#24201D] rounded-3xl p-4 shadow-[4px_4px_0px_#24201D] flex flex-col h-[85vh] max-h-[700px] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#24201D]/15 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-xs overflow-hidden p-0.5 shrink-0">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="50" cy="50" r="46" fill="#DDE8DE" stroke="#24201D" strokeWidth="4" />
                <ellipse cx="38" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#24201D" strokeWidth="3" />
                <ellipse cx="38" cy="26" rx="3.5" ry="11" fill="#FCA5A5" />
                <ellipse cx="62" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#24201D" strokeWidth="3" />
                <ellipse cx="62" cy="26" rx="3.5" ry="11" fill="#FCA5A5" />
                <circle cx="50" cy="56" r="28" fill="#FFFFFF" stroke="#24201D" strokeWidth="3" />
                <ellipse cx="40" cy="52" rx="4" ry="5" fill="#24201D" />
                <circle cx="39" cy="50" r="1.5" fill="#FFFFFF" />
                <ellipse cx="60" cy="52" rx="4" ry="5" fill="#24201D" />
                <circle cx="59" cy="50" r="1.5" fill="#FFFFFF" />
                <ellipse cx="50" cy="59" rx="2.5" ry="1.8" fill="#C25E40" />
                <path d="M47 62 Q50 65 53 62" stroke="#24201D" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="34" cy="58" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.8" />
                <ellipse cx="66" cy="58" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.8" />
              </svg>
            </div>

            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#24201D]">
                Sumire Companion
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Scout-Archivist • Управление планами и здоровьем
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearHistory}
              title="Очистить чат"
              className="w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-rose-50 border border-[#24201D] flex items-center justify-center text-stone-600 hover:text-rose-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-stone-700 hover:text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Messages Stream Container */}
        <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl border-[1.75px] border-[#24201D] text-xs font-medium leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#F0BB58] text-[#24201D] rounded-tr-xs shadow-[2px_2px_0px_#24201D]'
                    : 'bg-[#FAF8F5] text-[#24201D] rounded-tl-xs shadow-[2px_2px_0px_#24201D]'
                }`}
              >
                {/* User Attached Image Thumbnail */}
                {msg.imagePreview && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-[#24201D] max-h-52">
                    <img src={msg.imagePreview} alt="Attached" className="w-full h-full object-cover" />
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Suggested Meal 1-Tap Save Card */}
                {msg.suggestedMeal && (
                  <div className="mt-2.5 p-3 bg-[#FFF9E6] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#24201D]">
                        <Utensils className="w-3.5 h-3.5 text-amber-700" />
                        <span>Оценка блюда: {msg.suggestedMeal.name}</span>
                      </div>
                      <span className="text-xs font-black font-mono-num text-[#24201D] bg-[#FEF08A] px-2 py-0.5 rounded-lg border border-[#24201D]/20">
                        {msg.suggestedMeal.kcal} ккал
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold font-mono-num text-[#6B635B]">
                      <span className="bg-white/90 px-1.5 py-0.5 rounded border border-black/10">Б: {msg.suggestedMeal.proteinGrams}г</span>
                      <span className="bg-white/90 px-1.5 py-0.5 rounded border border-black/10">Ж: {msg.suggestedMeal.fatGrams}г</span>
                      <span className="bg-white/90 px-1.5 py-0.5 rounded border border-black/10">У: {msg.suggestedMeal.carbsGrams}г</span>
                      <span className="ml-auto text-[9px] font-black uppercase text-stone-500">
                        {msg.suggestedMeal.mealType === 'breakfast' ? 'Завтрак' : msg.suggestedMeal.mealType === 'lunch' ? 'Обед' : msg.suggestedMeal.mealType === 'dinner' ? 'Ужин' : 'Перекус'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLogSuggestedMeal(msg.suggestedMeal!, msg.id)}
                      className="w-full py-2 px-3 rounded-xl bg-[#2D503C] hover:bg-[#233f2f] text-white text-xs font-black tracking-wide flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Записать в дневник питания</span>
                    </button>
                  </div>
                )}

                {/* Executed Action Cards */}
                {msg.executedActions && msg.executedActions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#24201D]/15 space-y-2">
                    {msg.executedActions.map((action, idx) => {
                      if (action.type === 'log_meal' && action.details) {
                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-[#24201D]/30 rounded-xl shadow-2xs space-y-1 text-[#24201D]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-black text-xs">
                                <Utensils className="w-3.5 h-3.5 text-[#C25E40]" />
                                <span>{action.details.name}</span>
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FEF08A] border border-[#24201D]/20">
                                  {action.details.mealType === 'breakfast'
                                    ? 'Завтрак'
                                    : action.details.mealType === 'lunch'
                                    ? 'Обед'
                                    : action.details.mealType === 'dinner'
                                    ? 'Ужин'
                                    : 'Перекус'}
                                </span>
                              </div>
                              <span className="text-xs font-black font-mono-num text-[#C25E40]">
                                +{action.details.kcal} ккал
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold font-mono-num text-[#6B635B]">
                              <span>Б: {action.details.proteinGrams}г</span>
                              <span>•</span>
                              <span>Ж: {action.details.fatGrams}г</span>
                              <span>•</span>
                              <span>У: {action.details.carbsGrams}г</span>
                              {action.details.time && (
                                <>
                                  <span>•</span>
                                  <span>{action.details.time}</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (action.type === 'log_water') {
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-[#E0F2FE] border border-[#0284C7]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#0369A1]"
                          >
                            <Droplets className="w-3.5 h-3.5 text-[#0284C7]" />
                            <span>{action.description}</span>
                          </div>
                        );
                      }

                      if (action.type === 'log_weight') {
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-[#FEF3C7] border border-[#D97706]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#B45309]"
                          >
                            <Scale className="w-3.5 h-3.5 text-[#D97706]" />
                            <span>{action.description}</span>
                          </div>
                        );
                      }

                      if (action.type === 'log_workout') {
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-[#FEE2E2] border border-[#DC2626]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#B91C1C]"
                          >
                            <Dumbbell className="w-3.5 h-3.5 text-[#DC2626]" />
                            <span>{action.description}</span>
                          </div>
                        );
                      }

                      if (action.type === 'create_task') {
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-[#FEF9C3] border border-[#CA8A04]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#854D0E]"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-[#CA8A04]" />
                            <span>{action.description}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="p-2 bg-[#DDE8DE] border border-[#3D6B52]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#2D503C]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#3D6B52] stroke-[2.5]" />
                          <span className="truncate">{action.description}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl rounded-tl-xs max-w-[140px] shadow-[2px_2px_0px_#24201D]">
              <div className="w-2 h-2 rounded-full bg-[#3D6B52] animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-[#3D6B52] animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full bg-[#3D6B52] animate-bounce" style={{ animationDelay: '0.4s' }} />
              <span className="text-[10px] font-bold text-stone-400 ml-1">Думаю...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Attached Image Thumbnail Preview Bar */}
        {attachedImage && (
          <div className="mb-2 px-3 py-2 bg-[#FBECCF] border-[1.5px] border-[#24201D] rounded-xl flex items-center justify-between shrink-0 shadow-2xs animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#24201D] shrink-0">
                <img src={attachedImage.previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <span className="text-[11px] font-bold text-[#24201D] truncate">Фото прикреплено для анализа</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="w-6 h-6 rounded-full bg-white border border-[#24201D] flex items-center justify-center text-stone-700 cursor-pointer hover:bg-rose-100 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar with Image & Voice Buttons */}
        <div className="pt-2 border-t border-[#24201D]/15 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center gap-2"
          >
            {/* Image Attachment Button */}
            <label
              title="Прикрепить фото еды или заметки"
              className="w-10 h-10 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-stone-700 shrink-0 shadow-2xs cursor-pointer active:translate-y-0.5 transition-all"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <ImageIcon className="w-4 h-4 stroke-[2.25]" />
            </label>

            {/* Voice Dictation Button & Language Selector */}
            <div className="relative flex items-center shrink-0">
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isRecording ? 'Остановить запись' : 'Голосовой ввод'}
                className={`w-10 h-10 rounded-xl border-[1.5px] border-[#24201D] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-2xs'
                    : 'bg-[#DDE8DE] hover:bg-[#C9DCCB] text-[#2D503C] shadow-2xs'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 stroke-[2.25]" />}
              </button>
              
              <button
                type="button"
                onClick={cycleVoiceLang}
                title={`Язык распознавания речи: ${voiceLang.toUpperCase()}. Нажмите для переключения.`}
                className="absolute -top-2 -right-1 px-1 py-0.2 rounded bg-white hover:bg-stone-100 border border-[#24201D] text-[8px] font-black font-mono-num text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                {getVoiceLanguageBadge(voiceLang)}
              </button>
            </div>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? 'Слушаю...' : 'Спросить или дать команду...'}
              className="flex-1 px-3 py-2 bg-[#FAF8F5] text-xs font-bold text-[#24201D] rounded-xl border-[1.5px] border-[#24201D] outline-none placeholder:text-stone-400 shadow-2xs"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && !attachedImage) || isLoading}
              className="w-10 h-10 rounded-xl bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-50 border-[1.5px] border-[#24201D] flex items-center justify-center text-white shrink-0 shadow-2xs cursor-pointer active:translate-y-0.5"
            >
              <Send className="w-4 h-4 stroke-[2.25]" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
