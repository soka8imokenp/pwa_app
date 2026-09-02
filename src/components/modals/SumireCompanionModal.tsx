import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
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
      content: "Hi! I'm ready to help.",
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

  const handleClearHistory = () => {
    playClickSound();
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: "History cleared. How can I help?",
        timestamp: Date.now(),
      },
    ]);
  };

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
      content: text || 'Analyze attached image:',
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
          content: `${err.message || 'Could not process request.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Voice input is not supported by this browser or device.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 flex flex-col h-[85vh] max-h-[680px] overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#24201D]/15 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-xs overflow-hidden p-0.5 shrink-0">
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
                Scout-Archivist • Kawaii Archive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearHistory}
              title="Clear chat"
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

                {/* Executed Action Cards */}
                {msg.executedActions && msg.executedActions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#24201D]/15 space-y-1.5">
                    {msg.executedActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#DDE8DE] border border-[#3D6B52]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#2D503C]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#3D6B52] stroke-[2.5]" />
                        <span className="truncate">{action.description}</span>
                      </div>
                    ))}
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
              <span className="text-[10px] font-bold text-stone-400 ml-1">Thinking...</span>
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
              <span className="text-[11px] font-bold text-[#24201D] truncate">Image attached for analysis</span>
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
            {/* Hidden File Input */}
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
              title="Attach image or notes photo"
              className="w-10 h-10 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-stone-700 shrink-0 shadow-2xs cursor-pointer active:translate-y-0.5 transition-all"
            >
              <ImageIcon className="w-4 h-4 stroke-[2.25]" />
            </button>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isRecording ? 'Stop recording' : 'Voice input'}
              className={`w-10 h-10 rounded-xl border-[1.5px] border-[#24201D] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-2xs'
                  : 'bg-[#DDE8DE] hover:bg-[#C9DCCB] text-[#2D503C] shadow-2xs'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 stroke-[2.25]" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? 'Listening...' : 'Type...'}
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
