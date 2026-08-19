import React, { useState } from 'react';
import { PlusCircle, Star, Code, Palette, BookOpen, Activity, FileText, Layers, X, Check } from 'lucide-react';
import type { Task } from '../../types';
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

  React.useEffect(() => {
    if (isOpen) {
      setIsPriority(defaultPriority);
    }
  }, [isOpen, defaultPriority]);

  if (!isOpen) return null;

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
    });

    setTitle('');
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
              Task Outcome / Goal
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement PWA offline sync & testing"
              className="w-full px-4 py-2.5 bg-[#FAF7F2] text-xs font-bold rounded-2xl border-[1.75px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Priority Toggle */}
          <div
            onClick={() => {
              if (canAddPriority) {
                playClickSound();
                setIsPriority(!isPriority);
              }
            }}
            className={`p-3 rounded-2xl border-[1.75px] transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
              isPriority
                ? 'bg-[#FEF08A] border-[#18181B]'
                : 'bg-[#FAF7F2] border-[#18181B]/20'
            } ${!canAddPriority ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <Star className={`w-4 h-4 ${isPriority ? 'text-amber-700 fill-amber-500' : 'text-slate-400'}`} />
              <div>
                <span className="text-xs font-black text-[#18181B] block">
                  Top-3 Priority Slot
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {canAddPriority ? 'Counts towards primary daily focus outcomes' : 'All 3 priority slots filled'}
                </span>
              </div>
            </div>

            <div className={`w-5 h-5 rounded-md border border-[#18181B] flex items-center justify-center ${isPriority ? 'bg-[#BEF264]' : 'bg-white'}`}>
              {isPriority && <Check className="w-3 h-3 text-[#18181B] stroke-[3]" />}
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
                  className={`py-2 px-2 rounded-xl border-[1.5px] text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    category === c.id
                      ? 'bg-[#C084FC] text-[#18181B] border-[#18181B] shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#18181B]'
                  }`}
                >
                  {c.icon}
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Duration */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
              Estimated Focus Time
            </label>
            <div className="flex items-center gap-1.5">
              {[15, 25, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setEstimatedMinutes(mins);
                  }}
                  className={`flex-1 py-1.5 rounded-xl border-[1.5px] text-xs font-black font-mono-num transition-all cursor-pointer ${
                    estimatedMinutes === mins
                      ? 'bg-[#BEF264] text-[#18181B] border-[#18181B] shadow-2xs'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-[#18181B]'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#BEF264] hover:bg-[#A3E635] text-[#18181B] border-[1.5px] border-[#18181B] text-xs font-black shadow-xs active:translate-y-0.5 cursor-pointer"
            >
              Save Quest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
