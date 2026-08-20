import React, { useState } from 'react';
import {
  PlusCircle,
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
  ChevronDown,
} from 'lucide-react';
import type { Task, SubTask } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  defaultDate: string;
  defaultPriority?: boolean;
  canAddPriority: boolean;
}

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
  const [isEstimateDropdownOpen, setIsEstimateDropdownOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const ESTIMATE_OPTIONS = [
    { value: 15, label: '15 Minutes' },
    { value: 25, label: '25 Minutes (Pomodoro)' },
    { value: 30, label: '30 Minutes' },
    { value: 45, label: '45 Minutes' },
    { value: 60, label: '60 Minutes (1 Hour)' },
    { value: 90, label: '90 Minutes (1.5h)' },
    { value: 120, label: '120 Minutes (2 Hours)' },
  ];

  React.useEffect(() => {
    if (isOpen) {
      setIsPriority(defaultPriority);
      setSubtasks([]);
      setNewSubtaskTitle('');
      setIsRecurring(false);
      setIsEstimateDropdownOpen(false);
    }
  }, [isOpen, defaultPriority]);

  if (!isOpen) return null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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

  const categories = [
    { id: 'code' as const, label: 'Dev & Code', icon: <Code className="w-3.5 h-3.5 stroke-[2.25]" /> },
    { id: 'design' as const, label: 'UI & Design', icon: <Palette className="w-3.5 h-3.5 stroke-[2.25]" /> },
    { id: 'learn' as const, label: 'Learning', icon: <BookOpen className="w-3.5 h-3.5 stroke-[2.25]" /> },
    { id: 'health' as const, label: 'Health', icon: <Activity className="w-3.5 h-3.5 stroke-[2.25]" /> },
    { id: 'admin' as const, label: 'Admin & Ops', icon: <FileText className="w-3.5 h-3.5 stroke-[2.25]" /> },
    { id: 'general' as const, label: 'General', icon: <Layers className="w-3.5 h-3.5 stroke-[2.25]" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#E9D5FF] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs">
              <PlusCircle className="w-5 h-5 text-purple-950 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#18181B]">
                Create New Task
              </h3>
              <p className="text-[10px] font-semibold text-slate-500 font-mono-num">
                Scheduled for {defaultDate}
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement WebSockets in Rust"
              className="w-full px-4 py-2.5 bg-[#FAF7F2] text-xs font-bold rounded-2xl border-[1.75px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Subtasks (Checklists) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Subtasks / Steps ({subtasks.length})
            </label>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="p-2 bg-[#FAF7F2] border border-[#18181B]/20 rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-bold text-[#18181B] truncate">{st.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
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
                placeholder="Add checklist step..."
                className="flex-1 px-3 py-1.5 bg-[#FAF7F2] text-xs font-medium rounded-xl border border-[#18181B]/30 outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="p-1.5 rounded-xl bg-white border border-[#18181B] text-[#18181B] cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
              Category
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setCategory(c.id);
                  }}
                  className={`py-2 px-2 rounded-2xl border-[1.5px] flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                    category === c.id
                      ? 'bg-[#FFE873] border-[#18181B] text-[#18181B] shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {c.icon}
                  <span className="text-[10px] tracking-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Time & Routine Toggle */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Custom Neo-Brutalist Estimate Dropdown */}
            <div className="relative">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Estimate
              </label>
              
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsEstimateDropdownOpen(!isEstimateDropdownOpen);
                }}
                className="w-full px-3 py-2 bg-[#FAF7F2] hover:bg-white text-xs font-bold rounded-2xl border-[1.75px] border-[#18181B] flex items-center justify-between shadow-2xs cursor-pointer active:translate-y-0.5 transition-all text-[#18181B]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-purple-700 shrink-0 stroke-[2.25]" />
                  <span className="truncate font-mono-num text-[11px]">
                    {ESTIMATE_OPTIONS.find((o) => o.value === estimatedMinutes)?.label || `${estimatedMinutes}m`}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${isEstimateDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Custom Dropdown Menu */}
              {isEstimateDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsEstimateDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 bottom-full mb-1.5 z-30 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[3px_3px_0px_#18181B] p-1.5 space-y-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {ESTIMATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setEstimatedMinutes(opt.value);
                          setIsEstimateDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                          estimatedMinutes === opt.value
                            ? 'bg-[#FFE873] text-[#18181B] border border-[#18181B] shadow-2xs'
                            : 'hover:bg-[#FAF7F2] text-slate-700'
                        }`}
                      >
                        <span className="font-mono-num">{opt.label}</span>
                        {estimatedMinutes === opt.value && (
                          <Check className="w-3 h-3 stroke-[2.5] text-[#18181B]" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Recurring Daily Toggle */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Routine
              </label>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsRecurring(!isRecurring);
                }}
                className={`w-full py-2 px-3 rounded-2xl border-[1.75px] border-[#18181B] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isRecurring
                    ? 'bg-[#BEF264] text-[#18181B] shadow-2xs'
                    : 'bg-[#FAF7F2] text-slate-500'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>{isRecurring ? 'Repeats Daily' : 'One-time'}</span>
              </button>
            </div>
          </div>

          {/* Priority Toggle Checkbox */}
          {canAddPriority && (
            <div
              onClick={() => {
                playClickSound();
                setIsPriority(!isPriority);
              }}
              className={`p-3 rounded-2xl border-[1.75px] border-[#18181B] flex items-center justify-between cursor-pointer transition-all ${
                isPriority
                  ? 'bg-[#FEF08A] shadow-2xs'
                  : 'bg-[#FAF7F2] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${isPriority ? 'text-amber-700 fill-amber-400' : 'text-slate-400'}`} />
                <div>
                  <h4 className="text-xs font-bold text-[#18181B]">Set as Top Focus Priority</h4>
                  <p className="text-[9px] text-slate-500 font-medium">Elevate to top 3 slots for today</p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-lg border-[1.5px] border-[#18181B] flex items-center justify-center ${
                  isPriority ? 'bg-[#18181B] text-white' : 'bg-white'
                }`}
              >
                {isPriority && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#FFE873] hover:bg-[#FED7AA] border-[2px] border-[#18181B] rounded-2xl font-black font-display uppercase tracking-wider text-xs text-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
