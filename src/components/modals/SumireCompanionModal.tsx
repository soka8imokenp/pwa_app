import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  Image as ImageIcon,
  Paperclip,
} from 'lucide-react';
import { askSumireAI, AIChatMessage } from '../../lib/aiService';
import { startVoiceDictation, stopVoiceDictation, isSpeechRecognitionSupported } from '../../lib/speechRecognition';
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
      content: 'Привет. У меня много работы в архиве, так что давай сразу по делу. Я вижу все твои задачи, привычки и блокнот на сегодня. Чем помочь? Можешь прикрепить фото заметок, надиктовать голосом или попросить раскидать план.',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ base64Data: string; mimeType: string; previewUrl: string } | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setAttachedImage({
        base64Data,
        mimeType: file.type || 'image/jpeg',
        previewUrl: result,
      });
      playClickSound();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if ((!text && !attachedImage) || isLoading) return;

    playClickSound();
    const currentAttachment = attachedImage;

    const userMsg: AIChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text || 'Посмотри прикрепленное изображение:',
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
          content: `${err.message || 'Не удалось выполнить запрос.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Голосовой ввод не поддерживается данным браузером/устройством.');
      return;
    }

    if (isRecording) {
      stopVoiceDictation();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      startVoiceDictation({
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
      });
    }
  };

  const QUICK_PROMPTS = [
    'Что у меня в приоритете на сегодня?',
    'Разбей мою задачу на 4 подшага',
    'Запиши в блокнот мысль: ',
    'Создай задачу на 45 минут',
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-[#18181B]/50 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-lg bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] flex flex-col h-[85vh] max-h-[720px] overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 bg-[#FAF7F2] border-b-[1.75px] border-[#18181B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8DCFF] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-xs overflow-hidden p-0.5">
              <img src="/sumire-avatar.png" alt="Sumire" className="w-full h-full object-cover rounded-[10px]" />
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-black font-display uppercase tracking-wider text-[#18181B]">
                Sumire Companion
              </h3>
              <p className="text-[10px] font-bold text-slate-400">
                Scout-Archivist • Kawaii Archive
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-slate-600 hover:text-[#18181B] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#FAF7F2]/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl border-[1.75px] border-[#18181B] text-xs font-medium leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#FFE873] text-[#18181B] rounded-tr-xs shadow-[2px_2px_0px_#18181B]'
                    : 'bg-white text-slate-800 rounded-tl-xs shadow-[2px_2px_0px_#18181B]'
                }`}
              >
                {/* User Attached Image Preview in Chat */}
                {msg.imagePreview && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-[#18181B] max-h-48">
                    <img src={msg.imagePreview} alt="Attached" className="w-full h-full object-cover" />
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Executed Action Pills */}
                {msg.executedActions && msg.executedActions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#18181B]/15 space-y-1.5">
                    {msg.executedActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#D1FBE4] border border-[#065F46]/30 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#065F46]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-700 stroke-[2.5]" />
                        <span className="truncate">{action.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl rounded-tl-xs max-w-[140px] shadow-[2px_2px_0px_#18181B]">
              <div className="w-2 h-2 rounded-full bg-[#A855F7] animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-[#A855F7] animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full bg-[#A855F7] animate-bounce" style={{ animationDelay: '0.4s' }} />
              <span className="text-[10px] font-bold text-slate-400 ml-1">Анализ...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-1.5 bg-[#FAF7F2] border-t border-[#18181B]/10 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (prompt.endsWith(': ')) {
                  setInputText(prompt);
                } else {
                  handleSendMessage(prompt);
                }
              }}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-[#18181B] rounded-xl text-[10px] font-bold text-[#18181B] shrink-0 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Attached Image Thumbnail Bar */}
        {attachedImage && (
          <div className="px-4 py-2 bg-[#FEF08A] border-t border-[#18181B]/20 flex items-center justify-between shrink-0 animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#18181B]">
                <img src={attachedImage.previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <span className="text-[11px] font-bold text-[#18181B]">Картинка прикреплена к анализу</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="w-6 h-6 rounded-full bg-white border border-[#18181B] flex items-center justify-center text-slate-700 cursor-pointer hover:bg-rose-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar with Image & Voice Buttons */}
        <div className="p-3 bg-white border-t-[1.75px] border-[#18181B] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden File Input for Image Analysis */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Image Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Прикрепить картинку / фото заметок"
              className="w-10 h-10 rounded-2xl bg-[#FAF7F2] hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-slate-700 shrink-0 shadow-[1.5px_1.5px_0px_#18181B] cursor-pointer active:translate-y-0.5 transition-all"
            >
              <ImageIcon className="w-4 h-4 stroke-[2.25]" />
            </button>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isRecording ? 'Остановить запись' : 'Голосовой ввод'}
              className={`w-10 h-10 rounded-2xl border-[1.75px] border-[#18181B] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-[2px_2px_0px_#18181B]'
                  : 'bg-[#E8DCFF] hover:bg-[#D8C4FF] text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 stroke-[2.25]" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? 'Слушаю ваш голос...' : 'Команда или вопрос Сумирэ...'}
              className="flex-1 px-4 py-2.5 bg-[#FAF7F2] text-xs font-bold rounded-2xl border-[1.75px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-2xs"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && !attachedImage) || isLoading}
              className="w-10 h-10 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] disabled:opacity-50 border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shrink-0 shadow-[1.5px_1.5px_0px_#18181B] cursor-pointer active:translate-y-0.5"
            >
              <Send className="w-4 h-4 stroke-[2.25]" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
