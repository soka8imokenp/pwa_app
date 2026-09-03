import React, { useState } from 'react';
import { Mic, MicOff, Check, X, ArrowRight, Wand2, Plus, Code, Palette, BookOpen, Activity, Crown } from 'lucide-react';
import {
  startVoiceDictation,
  stopVoiceDictation,
  isSpeechRecognitionSupported,
  getVoiceLanguage,
  setVoiceLanguage,
  splitVoiceIntoTasks,
  VoiceLanguage,
} from '../../lib/speechRecognition';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface SmartBraindumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAddTasks: (tasks: Omit<Task, 'id' | 'createdAt'>[]) => Promise<any>;
  selectedDate: string;
  canAddPriority: boolean;
}

interface ParsedItem {
  title: string;
  isPriority: boolean;
  category: Task['category'];
  estimatedMinutes: number;
}

export const SmartBraindumpModal: React.FC<SmartBraindumpModalProps> = ({
  isOpen,
  onClose,
  onBulkAddTasks,
  selectedDate,
  canAddPriority,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(() => getVoiceLanguage());
  const [parsedTasks, setParsedTasks] = useState<ParsedItem[]>([]);

  if (!isOpen) return null;

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

  const handleToggleVoice = () => {
    playClickSound();
    if (isListening) {
      stopVoiceDictation();
      setIsListening(false);
    } else {
      setIsListening(true);
      startVoiceDictation({
        onTranscript: (text) => {
          setInputText(text);
        },
        onError: () => setIsListening(false),
        onEnd: () => setIsListening(false),
      }, {
        lang: voiceLang,
        continuous: true,
        autoPunctuate: true,
      });
    }
  };

  const parseBraindump = () => {
    if (!inputText.trim()) return;
    playClickSound();

    // Split text by lines, transitions (затем, потом, and then) or punctuation
    const voiceTasks = splitVoiceIntoTasks(inputText);
    const lines = voiceTasks.length > 0
      ? voiceTasks
      : inputText
          .split(/[\n,;]+/)
          .map((l) => l.trim())
          .filter((l) => l.length > 2);

    const items: ParsedItem[] = lines.map((line, idx) => {
      let category: Task['category'] = 'general';
      const lower = line.toLowerCase();

      if (lower.includes('code') || lower.includes('bug') || lower.includes('dev') || lower.includes('api') || lower.includes('test') || lower.includes('refactor') || lower.includes('deploy') || lower.includes('код') || lower.includes('баг')) {
        category = 'code';
      } else if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('figma') || lower.includes('дизайн') || lower.includes('макет')) {
        category = 'design';
      } else if (lower.includes('read') || lower.includes('book') || lower.includes('study') || lower.includes('learn') || lower.includes('книг') || lower.includes('учеба') || lower.includes('урок')) {
        category = 'learn';
      } else if (lower.includes('gym') || lower.includes('workout') || lower.includes('run') || lower.includes('stretch') || lower.includes('спорт') || lower.includes('тренировк') || lower.includes('бег')) {
        category = 'health';
      } else if (lower.includes('email') || lower.includes('call') || lower.includes('meeting') || lower.includes('admin') || lower.includes('почт') || lower.includes('созвон')) {
        category = 'admin';
      }

      // Estimate duration based on keywords
      let estimatedMinutes = 30;
      if (lower.includes('quick') || lower.includes('быстро') || lower.includes('15')) estimatedMinutes = 15;
      if (lower.includes('deep') || lower.includes('refactor') || lower.includes('60') || lower.includes('час')) estimatedMinutes = 60;
      if (lower.includes('45')) estimatedMinutes = 45;

      return {
        title: line,
        isPriority: idx < (canAddPriority ? 3 : 0),
        category,
        estimatedMinutes,
      };
    });

    setParsedTasks(items);
  };

  const handleImport = async () => {
    if (parsedTasks.length === 0) return;
    playSuccessChime();

    const tasksPayload: Omit<Task, 'id' | 'createdAt'>[] = parsedTasks.map((item) => ({
      title: item.title,
      isPriority: item.isPriority,
      isCompleted: false,
      date: selectedDate,
      category: item.category,
      estimatedMinutes: item.estimatedMinutes,
    }));

    await onBulkAddTasks(tasksPayload);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setInputText('');
    setParsedTasks([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#F0BB58] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <Wand2 className="w-5 h-5 text-[#24201D] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#24201D]">
                Smart Braindump & Voice
              </h3>
              <p className="text-[10px] font-semibold text-[#6B635B]">
                Dump tasks or speak freely — auto-categorized
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

        {/* Input Area */}
        <div className="space-y-2">
          <div className="relative">
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type raw thoughts:&#10;• Fix navigation bug&#10;• Gym workout and stretch&#10;• Read 25 pages&#10;• Review roadmap"
              className="w-full p-3.5 bg-[#FAF8F5] text-xs font-bold text-[#24201D] rounded-2xl border-[1.75px] border-[#24201D] outline-none placeholder:text-stone-400 shadow-2xs resize-none"
            />

            {/* Voice Dictation & Language Switcher */}
            {isSpeechRecognitionSupported() && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cycleVoiceLang}
                  title={`Voice Language: ${voiceLang.toUpperCase()}. Tap to switch.`}
                  className="px-2 py-1 rounded-full bg-white hover:bg-stone-100 border border-[#24201D]/30 text-[9px] font-black font-mono-num text-[#24201D] shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  {voiceLang === 'auto' ? 'AUTO' : voiceLang.split('-')[0].toUpperCase()}
                </button>
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`p-2 rounded-full border-[1.5px] border-[#24201D] shadow-xs cursor-pointer transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-white text-stone-600 hover:bg-[#DDE8DE]'
                  }`}
                  title={isListening ? 'Stop recording' : 'Voice Dictate'}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <Mic className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={parseBraindump}
            disabled={!inputText.trim()}
            className="w-full py-2.5 rounded-full bg-[#FAF8F5] hover:bg-stone-100 disabled:opacity-40 text-[#24201D] border-[1.75px] border-[#24201D] text-xs font-black shadow-xs active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <Wand2 className="w-4 h-4 stroke-[2.5]" />
            <span>Parse & Organize Thoughts</span>
          </button>
        </div>

        {/* Parsed Preview List */}
        {parsedTasks.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B]">
                Organized Quests ({parsedTasks.length})
              </span>
              <span className="text-[10px] font-bold text-[#854D0E] bg-[#FBECCF] px-2 py-0.5 rounded-full border border-[#24201D]">
                Top {parsedTasks.filter((t) => t.isPriority).length} Priorities
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {parsedTasks.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      onClick={() => {
                        const updated = [...parsedTasks];
                        updated[idx].isPriority = !updated[idx].isPriority;
                        setParsedTasks(updated);
                      }}
                      className={`w-6 h-6 rounded-full border border-[#24201D] flex items-center justify-center text-xs shrink-0 cursor-pointer ${
                        item.isPriority ? 'bg-[#F0BB58]' : 'bg-white text-stone-400'
                      }`}
                      title="Toggle Priority"
                    >
                      {item.isPriority ? <Crown className="w-3 h-3 text-[#854D0E]" /> : '#'}
                    </button>
                    <span className="text-xs font-bold text-[#24201D] truncate">
                      {item.title}
                    </span>
                  </div>

                  <span className="text-[9px] font-bold text-[#2D503C] uppercase bg-white px-2 py-0.5 rounded-md border border-[#24201D]/15 shrink-0">
                    {item.category} • {item.estimatedMinutes}m
                  </span>
                </div>
              ))}
            </div>

            {/* Import All Button */}
            <button
              onClick={handleImport}
              className="w-full py-2.5 rounded-full bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] text-xs font-black shadow-xs active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5 transition-all mt-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Import All into Planner</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
