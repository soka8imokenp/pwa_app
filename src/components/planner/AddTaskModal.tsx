import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Star,
  Code,
  Palette,
  BookOpen,
  Activity,
  FileText,
  Layers,
  X,
  Check,
  Plus,
  Trash2,
  Repeat,
  Clock,
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { Task, SubTask } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import {
  startVoiceDictation,
  stopVoiceDictation,
  isSpeechRecognitionSupported,
  getVoiceLanguage,
} from '../../lib/speechRecognition';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  defaultDate: string;
  defaultPriority?: boolean;
  canAddPriority: boolean;
}

const CATEGORIES: { id: Task['category']; label: string; bg: string; color: string; icon: React.ReactNode }[] = [
  { id: 'code', label: 'Dev & Code', bg: '#DDE8DE', color: '#2D503C', icon: <Code className="w-3.5 h-3.5 stroke-[2.25]" /> },
  { id: 'design', label: 'UI & Design', bg: '#F7E3DC', color: '#C25E40', icon: <Palette className="w-3.5 h-3.5 stroke-[2.25]" /> },
  { id: 'learn', label: 'Learning', bg: '#FBECCF', color: '#854D0E', icon: <BookOpen className="w-3.5 h-3.5 stroke-[2.25]" /> },
  { id: 'health', label: 'Health', bg: '#DDE8DE', color: '#2D503C', icon: <Activity className="w-3.5 h-3.5 stroke-[2.25]" /> },
  { id: 'admin', label: 'Admin & Ops', bg: '#F4F0EA', color: '#574B3E', icon: <FileText className="w-3.5 h-3.5 stroke-[2.25]" /> },
  { id: 'general', label: 'General', bg: '#FAF8F5', color: '#24201D', icon: <Layers className="w-3.5 h-3.5 stroke-[2.25]" /> },
];

const ESTIMATE_OPTIONS = [
  { value: 15, label: '15m' },
  { value: 25, label: '25m (Pomo)' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '60m (1h)' },
  { value: 90, label: '90m' },
];

const SMART_TEMPLATES = [
  { label: 'Deep Focus Work', category: 'code' as const, minutes: 45 },
  { label: 'UI Polish & Review', category: 'design' as const, minutes: 30 },
  { label: 'Read 20 Pages', category: 'learn' as const, minutes: 25 },
  { label: 'Gym & Stretch', category: 'health' as const, minutes: 45 },
  { label: 'Inbox & Planning', category: 'admin' as const, minutes: 15 },
];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  defaultDate,
  defaultPriority = false,
  canAddPriority,
}) => {
  const [title, setTitle] = useState('');
  const [isPriority, setIsPriority] = useState(defaultPriority);
  const [category, setCategory] = useState<Task['category']>('code');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [isRecurring, setIsRecurring] = useState(false);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsPriority(defaultPriority);
      setSubtasks([]);
      setNewSubtaskTitle('');
      setIsRecurring(false);
      setIsVoiceActive(false);
    }
  }, [isOpen, defaultPriority]);

  if (!isOpen) return null;

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Voice dictation is supported in Chrome/Edge/Android.');
      return;
    }

    if (isVoiceActive) {
      stopVoiceDictation();
      setIsVoiceActive(false);
    } else {
      playClickSound();
      setIsVoiceActive(true);
      startVoiceDictation(
        {
          onTranscript: (transcript: string) => {
            setTitle(transcript);
          },
          onError: () => setIsVoiceActive(false),
          onEnd: () => setIsVoiceActive(false),
        },
        {
          lang: getVoiceLanguage(),
          continuous: true,
          autoPunctuate: true,
        }
      );
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    playClickSound();
    setSubtasks([
      ...subtasks,
      {
        id: Date.now().toString(),
        title: newSubtaskTitle.trim(),
        isCompleted: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    playClickSound();
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleApplyTemplate = (tmpl: typeof SMART_TEMPLATES[0]) => {
    playClickSound();
    setTitle(tmpl.label);
    setCategory(tmpl.category);
    setEstimatedMinutes(tmpl.minutes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isVoiceActive) {
      stopVoiceDictation();
      setIsVoiceActive(false);
    }

    playSuccessChime();
    onAddTask({
      title: title.trim(),
      isPriority: canAddPriority ? isPriority : false,
      isCompleted: false,
      date: defaultDate,
      category,
      estimatedMinutes: Number(estimatedMinutes) || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      isRecurring,
    });

    setTitle('');
    setSubtasks([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <Calendar className="w-5 h-5 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#24201D]">
                Create New Task
              </h3>
              <p className="text-[10px] font-semibold text-[#6B635B] font-mono-num">
                Target date: {defaultDate}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isVoiceActive) stopVoiceDictation();
              playClickSound();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#FAF8F5] hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-stone-600 hover:text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Quick Smart Templates */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#6B635B]">
            <Sparkles className="w-3 h-3 text-[#E09F3E]" />
            <span>Quick Templates</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {SMART_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] hover:bg-[#F4F0EA] border border-[#24201D]/25 text-[11px] font-bold text-[#24201D] whitespace-nowrap cursor-pointer active:scale-95 transition-all shadow-2xs"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title Input with Embedded Voice Mic */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#24201D] mb-1">
              Task Title
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What outcome will you achieve?"
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#FAF8F5] text-xs font-bold text-[#24201D] rounded-2xl border-[1.75px] border-[#24201D] outline-none placeholder:text-stone-400 shadow-2xs focus:bg-white"
              />
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isVoiceActive ? 'Stop recording' : 'Voice input'}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl border transition-all cursor-pointer ${
                  isVoiceActive
                    ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                    : 'bg-white hover:bg-stone-100 border-[#24201D]/30 text-[#C25E40]'
                }`}
              >
                {isVoiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Category Chips with Aesthetic Colors */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#24201D] mb-1">
              Category
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => {
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setCategory(c.id);
                    }}
                    className={`py-2 px-2 rounded-xl border-[1.5px] flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#24201D] shadow-2xs ring-2 ring-[#24201D]'
                        : 'border-[#24201D]/25 opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.bg, color: c.color }}
                  >
                    {c.icon}
                    <span className="text-[10px] font-black tracking-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estimated Time (Segmented Fast Chips) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black uppercase tracking-wider text-[#24201D] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#3D6B52]" />
                <span>Estimated Time</span>
              </label>
              <span className="text-[10px] font-mono-num font-black text-[#6B635B]">
                {estimatedMinutes} min
              </span>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-[#F4F0EA] border border-[#24201D]/30 rounded-2xl">
              {ESTIMATE_OPTIONS.map((opt) => {
                const isSelected = estimatedMinutes === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setEstimatedMinutes(opt.value);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-center text-xs font-black transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#3D6B52] text-white border border-[#24201D] shadow-2xs'
                        : 'text-[#6B635B] hover:text-[#24201D] hover:bg-white/60'
                    }`}
                  >
                    <span className="font-mono-num text-[11px] leading-none">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks / Checklist Steps */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#24201D]">
                Checklist Steps ({subtasks.length})
              </label>
              {subtasks.length > 0 && (
                <span className="text-[9px] font-mono-num text-[#6B635B] font-bold">
                  {subtasks.filter((s) => s.isCompleted).length}/{subtasks.length} done
                </span>
              )}
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                {subtasks.map((st, idx) => (
                  <div
                    key={st.id}
                    className="p-2 bg-[#FAF8F5] border border-[#24201D]/25 rounded-xl flex items-center justify-between gap-2 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 rounded-md bg-[#DDE8DE] border border-[#24201D] text-[9px] font-mono-num font-black text-[#2D503C] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-[#24201D] truncate">{st.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-stone-400 hover:text-rose-600 p-0.5 cursor-pointer transition-colors"
                      title="Remove step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add checklist step (press Enter)..."
                className="flex-1 px-3 py-2 bg-[#FAF8F5] text-xs font-bold text-[#24201D] rounded-xl border border-[#24201D]/30 outline-none placeholder:text-stone-400 shadow-2xs focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="p-2 rounded-xl bg-white hover:bg-stone-100 border border-[#24201D] text-[#24201D] cursor-pointer disabled:opacity-40 shadow-2xs active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Toggles: Top Focus Priority & Routine */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            {/* Top Priority Toggle */}
            {canAddPriority && (
              <div
                onClick={() => {
                  playClickSound();
                  setIsPriority(!isPriority);
                }}
                className={`p-2.5 rounded-2xl border-[1.5px] border-[#24201D] flex items-center justify-between cursor-pointer transition-all ${
                  isPriority
                    ? 'bg-[#FBECCF] shadow-2xs'
                    : 'bg-[#FAF8F5] hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Star className={`w-4 h-4 shrink-0 ${isPriority ? 'text-[#854D0E] fill-[#F0BB58]' : 'text-stone-400'}`} />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-[#24201D] leading-tight">Top Priority</h4>
                    <p className="text-[9px] text-[#6B635B] font-bold truncate">Top 3 outcomes</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-lg border-[1.5px] border-[#24201D] flex items-center justify-center shrink-0 ${
                    isPriority ? 'bg-[#24201D] text-white' : 'bg-white'
                  }`}
                >
                  {isPriority && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            )}

            {/* Routine Daily Toggle */}
            <div
              onClick={() => {
                playClickSound();
                setIsRecurring(!isRecurring);
              }}
              className={`p-2.5 rounded-2xl border-[1.5px] border-[#24201D] flex items-center justify-between cursor-pointer transition-all ${
                isRecurring
                  ? 'bg-[#DDE8DE] shadow-2xs'
                  : 'bg-[#FAF8F5] hover:bg-stone-50'
              } ${!canAddPriority ? 'sm:col-span-2' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Repeat className={`w-4 h-4 shrink-0 ${isRecurring ? 'text-[#2D503C]' : 'text-stone-400'}`} />
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-[#24201D] leading-tight">Daily Routine</h4>
                  <p className="text-[9px] text-[#6B635B] font-bold truncate">{isRecurring ? 'Repeats every day' : 'One-time quest'}</p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-lg border-[1.5px] border-[#24201D] flex items-center justify-center shrink-0 ${
                  isRecurring ? 'bg-[#2D503C] text-white' : 'bg-white'
                }`}
              >
                {isRecurring && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim()}
              className="w-full py-3 bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-40 border-[2px] border-[#24201D] rounded-2xl font-black font-display uppercase tracking-wider text-xs text-white shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <span>Create Task</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
