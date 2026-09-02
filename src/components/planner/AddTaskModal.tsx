import React, { useState } from 'react';
import {
  Calendar,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
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
                Scheduled for {defaultDate}
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#24201D] mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement WebSockets in Rust"
              className="w-full px-4 py-2.5 bg-[#FAF8F5] text-xs font-bold text-[#24201D] rounded-2xl border-[1.75px] border-[#24201D] outline-none placeholder:text-stone-400 shadow-2xs"
            />
          </div>

          {/* Subtasks (Checklists) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-[#24201D]">
              Subtasks / Steps ({subtasks.length})
            </label>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-bold text-[#24201D] truncate">{st.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-stone-400 hover:text-rose-600 cursor-pointer"
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
                className="flex-1 px-3 py-1.5 bg-[#FAF8F5] text-xs font-medium text-[#24201D] rounded-xl border border-[#24201D]/30 outline-none placeholder:text-stone-400"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="p-1.5 rounded-xl bg-white border border-[#24201D] text-[#24201D] cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#24201D] mb-1">
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
                      ? 'bg-[#F0BB58] border-[#24201D] text-[#24201D] shadow-2xs'
                      : 'bg-white border-stone-200 text-[#6B635B] hover:border-[#24201D]'
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
            {/* Estimate Dropdown */}
            <div className="relative">
              <label className="block text-xs font-black uppercase tracking-wider text-[#24201D] mb-1">
                Estimate
              </label>
              
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsEstimateDropdownOpen(!isEstimateDropdownOpen);
                }}
                className="w-full px-3 py-2 bg-[#FAF8F5] hover:bg-white text-xs font-bold rounded-2xl border-[1.75px] border-[#24201D] flex items-center justify-between shadow-2xs cursor-pointer active:translate-y-0.5 transition-all text-[#24201D]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-[#3D6B52] shrink-0 stroke-[2.25]" />
                  <span className="truncate font-mono-num text-[11px]">
                    {ESTIMATE_OPTIONS.find((o) => o.value === estimatedMinutes)?.label || `${estimatedMinutes}m`}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-500 shrink-0 transition-transform ${isEstimateDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Custom Dropdown Menu */}
              {isEstimateDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsEstimateDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 bottom-full mb-1.5 z-30 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[3px_3px_0px_#24201D] p-1.5 space-y-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
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
                            ? 'bg-[#F0BB58] text-[#24201D] border border-[#24201D] shadow-2xs'
                            : 'hover:bg-[#FAF8F5] text-stone-700'
                        }`}
                      >
                        <span className="font-mono-num">{opt.label}</span>
                        {estimatedMinutes === opt.value && (
                          <Check className="w-3 h-3 stroke-[2.5] text-[#24201D]" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Recurring Daily Toggle */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#24201D] mb-1">
                Routine
              </label>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsRecurring(!isRecurring);
                }}
                className={`w-full py-2 px-3 rounded-2xl border-[1.75px] border-[#24201D] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isRecurring
                    ? 'bg-[#DDE8DE] text-[#2D503C] shadow-2xs'
                    : 'bg-[#FAF8F5] text-stone-500'
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
              className={`p-3 rounded-2xl border-[1.75px] border-[#24201D] flex items-center justify-between cursor-pointer transition-all ${
                isPriority
                  ? 'bg-[#FBECCF] shadow-2xs'
                  : 'bg-[#FAF8F5] hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${isPriority ? 'text-[#854D0E] fill-[#F0BB58]' : 'text-stone-400'}`} />
                <div>
                  <h4 className="text-xs font-bold text-[#24201D]">Set as Top Focus Priority</h4>
                  <p className="text-[9px] text-[#6B635B] font-medium">Elevate to top 3 slots for today</p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-lg border-[1.5px] border-[#24201D] flex items-center justify-center ${
                  isPriority ? 'bg-[#24201D] text-white' : 'bg-white'
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
              className="w-full py-3 bg-[#3D6B52] hover:bg-[#345B45] border-[2px] border-[#24201D] rounded-2xl font-black font-display uppercase tracking-wider text-xs text-white shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
