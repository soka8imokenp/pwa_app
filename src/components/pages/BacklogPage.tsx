import React, { useState } from 'react';
import {
  Search,
  Plus,
  ArrowUp,
  Trash2,
  Check,
  Code,
  Palette,
  BookOpen,
  Activity,
  Archive,
  Crown,
  Layers,
  Repeat,
  ListFilter,
  X,
} from 'lucide-react';
import type { Task } from '../../types';
import { playTaskCheckSound, playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface BacklogPageProps {
  backlogTasks: Task[];
  canPromoteToPriority: boolean;
  onToggleComplete: (task: Task) => void;
  onPromoteToPriority: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onQuickAddTask: (title: string, category?: string, minutes?: number) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <Layers className="w-3 h-3" /> },
  { id: 'code', label: 'Code', icon: <Code className="w-3 h-3 text-purple-700" />, color: '#E8DCFF' },
  { id: 'design', label: 'Design', icon: <Palette className="w-3 h-3 text-pink-700" />, color: '#FED7AA' },
  { id: 'learn', label: 'Learn', icon: <BookOpen className="w-3 h-3 text-amber-700" />, color: '#FEF08A' },
  { id: 'health', label: 'Health', icon: <Activity className="w-3 h-3 text-emerald-700" />, color: '#D1FBE4' },
  { id: 'general', label: 'General', icon: <Layers className="w-3 h-3 text-slate-700" />, color: '#FAF7F2' },
];

export const BacklogPage: React.FC<BacklogPageProps> = ({
  backlogTasks,
  canPromoteToPriority,
  onToggleComplete,
  onPromoteToPriority,
  onDeleteTask,
  onQuickAddTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'done'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const activeCount = backlogTasks.filter((t) => !t.isCompleted).length;
  const doneCount = backlogTasks.filter((t) => t.isCompleted).length;

  const handleCheck = (task: Task) => {
    playTaskCheckSound();
    onToggleComplete(task);

    if (!task.isCompleted) {
      setTimeout(() => {
        playSuccessChime();
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.7 },
          colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
        });
      }, 100);
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    playClickSound();
    const cat = selectedCategory !== 'all' ? selectedCategory : 'general';
    onQuickAddTask(quickTitle.trim(), cat, 30);
    setQuickTitle('');
    setIsAdding(false);
  };

  const handlePromote = (task: Task) => {
    playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
    onPromoteToPriority(task);
  };

  const filteredTasks = backlogTasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'active' && t.isCompleted) return false;
    if (statusFilter === 'done' && !t.isCompleted) return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    return true;
  });

  const getCategoryConfig = (category?: string) => {
    return CATEGORIES.find((c) => c.id === (category || 'general')) || CATEGORIES[5];
  };

  return (
    <div className="w-full space-y-4 pb-24 font-body select-none">
      
      {/* 1. Header Overview Card */}
      <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Task Backlog Vault
            </span>
            <h2 className="text-sm font-black font-display uppercase tracking-tight text-[#18181B] mt-0.5">
              {activeCount} Active Tasks
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {canPromoteToPriority && (
              <span className="text-[10px] font-black text-[#18181B] bg-[#FFE873] px-2.5 py-1 rounded-xl border border-[#18181B] shadow-2xs flex items-center gap-1">
                <Crown className="w-3 h-3 stroke-[2.25] text-amber-900" />
                <span>Top 3 Open</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsAdding(!isAdding);
              }}
              className="px-3 py-1 bg-[#18181B] text-white rounded-xl text-[10px] font-black shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Quick Add Inline Box */}
        {isAdding && (
          <form
            onSubmit={handleQuickAdd}
            className="p-3 bg-[#FAF7F2] border-[1.5px] border-[#18181B] rounded-xl space-y-2 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-600">
                New Backlog Task
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                required
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="What needs to get done later?"
                className="flex-1 px-3 py-2 bg-white border border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] placeholder:text-slate-400 outline-none shadow-2xs"
              />
              <button
                type="submit"
                disabled={!quickTitle.trim()}
                className="px-3.5 py-2 bg-[#FFE873] hover:bg-[#FED7AA] disabled:opacity-40 text-[#18181B] border border-[#18181B] rounded-xl text-xs font-black shadow-2xs active:scale-95 cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Search & Status Filters */}
        <div className="space-y-2 pt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-8 py-1.5 bg-[#FAF7F2] focus:bg-white border border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] placeholder:text-slate-400 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#18181B] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center justify-between gap-1 pt-1">
            <div className="flex items-center gap-1">
              {(['active', 'all', 'done'] as const).map((s) => {
                const isSelected = statusFilter === s;
                const count =
                  s === 'active'
                    ? activeCount
                    : s === 'done'
                    ? doneCount
                    : backlogTasks.length;

                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setStatusFilter(s);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#18181B] text-white border border-[#18181B] shadow-2xs'
                        : 'bg-[#FAF7F2] text-slate-500 hover:text-slate-800 border border-[#18181B]/15'
                    }`}
                  >
                    {s} ({count})
                  </button>
                );
              })}
            </div>

            {/* Category Filter dropdown or selector */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isSel = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedCategory(cat.id);
                    }}
                    className={`px-2 py-0.5 rounded-lg border text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                      isSel
                        ? 'border-[#18181B] bg-[#FFE873] text-[#18181B] shadow-2xs ring-1 ring-[#18181B]'
                        : 'bg-[#FAF7F2] text-slate-400 border-[#18181B]/15 hover:text-slate-700'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tasks List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-white border-[1.75px] border-dashed border-[#18181B]/30 rounded-2xl space-y-2">
            <Archive className="w-6 h-6 text-slate-300 mx-auto" />
            <h4 className="text-xs font-black font-display uppercase tracking-wider text-slate-400">
              {searchQuery ? 'No matching tasks found' : 'Backlog is empty'}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold">
              {searchQuery ? 'Try clearing search filters' : 'Add low-priority tasks here to keep your today clear!'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const catConfig = getCategoryConfig(task.category);

            return (
              <div
                key={task.id}
                className={`group p-3 bg-white border-[1.75px] border-[#18181B] rounded-xl shadow-2xs flex items-center justify-between gap-3 transition-all ${
                  task.isCompleted
                    ? 'bg-slate-50 opacity-60'
                    : 'hover:shadow-[2px_2px_0px_#18181B] hover:-translate-y-0.5'
                }`}
              >
                {/* Left: Checkbox + Title + Meta */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleCheck(task)}
                    className={`w-5 h-5 rounded-md border-[1.5px] border-[#18181B] flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${
                      task.isCompleted ? 'bg-[#BEF264] text-[#18181B]' : 'bg-white hover:bg-slate-100'
                    }`}
                  >
                    {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-black truncate text-[#18181B] ${
                          task.isCompleted ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.isRecurring && (
                        <span title="Daily Routine">
                          <Repeat className="w-3 h-3 text-purple-600 shrink-0" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-bold text-slate-500">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded border border-[#18181B]/20"
                        style={{ backgroundColor: catConfig.color || '#FAF7F2' }}
                      >
                        {catConfig.icon}
                        <span className="capitalize">{task.category || 'general'}</span>
                      </span>

                      {task.subtasks && task.subtasks.length > 0 && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>
                            {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length} steps
                          </span>
                        </>
                      )}

                      <span className="text-slate-300">•</span>
                      <span className="font-mono-num">{task.estimatedMinutes || 30}m</span>
                    </div>
                  </div>
                </div>

                {/* Right: Promote & Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  {!task.isCompleted && canPromoteToPriority && (
                    <button
                      type="button"
                      onClick={() => handlePromote(task)}
                      title="Promote to Today Top 3"
                      className="px-2.5 py-1 bg-[#FFE873] hover:bg-[#FED7AA] text-[#18181B] border border-[#18181B] rounded-lg text-[9px] font-black flex items-center gap-0.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                    >
                      <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                      <span>Top 3</span>
                    </button>
                  )}

                  {task.id && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onDeleteTask(task.id!);
                      }}
                      title="Delete task"
                      className="w-6 h-6 rounded-lg bg-[#FAF7F2] hover:bg-rose-50 border border-[#18181B]/20 hover:border-rose-400 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer shadow-2xs active:scale-95 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
