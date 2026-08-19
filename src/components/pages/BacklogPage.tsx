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
  CheckSquare,
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

export const BacklogPage: React.FC<BacklogPageProps> = ({
  backlogTasks,
  canPromoteToPriority,
  onToggleComplete,
  onPromoteToPriority,
  onDeleteTask,
  onQuickAddTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quickTitle, setQuickTitle] = useState('');

  const activeCount = backlogTasks.filter((t) => !t.isCompleted).length;
  const doneCount = backlogTasks.filter((t) => t.isCompleted).length;

  const handleCheck = (task: Task) => {
    playTaskCheckSound();
    onToggleComplete(task);

    if (!task.isCompleted) {
      setTimeout(() => {
        playSuccessChime();
        confetti({
          particleCount: 50,
          spread: 60,
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
    onQuickAddTask(quickTitle.trim(), selectedCategory !== 'all' ? selectedCategory : 'general', 30);
    setQuickTitle('');
  };

  const handlePromote = (task: Task) => {
    playSuccessChime();
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
    onPromoteToPriority(task);
  };

  const filteredTasks = backlogTasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'active' && t.isCompleted) return false;
    if (filter === 'done' && !t.isCompleted) return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    return true;
  });

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'code':
        return <Code className="w-3.5 h-3.5" />;
      case 'design':
        return <Palette className="w-3.5 h-3.5" />;
      case 'health':
        return <Activity className="w-3.5 h-3.5" />;
      case 'learn':
        return <BookOpen className="w-3.5 h-3.5" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="w-full space-y-4 pb-20 font-body select-none">
      {/* 1. Header Overview & Counters */}
      <div className="neo-card p-4 flex items-center justify-between gap-3 bg-white">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Task Backlog Vault
          </span>
          <h2 className="text-base font-bold font-display text-[#18181B] mt-0.5">
            {activeCount} Active Tasks
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {canPromoteToPriority && (
            <span className="text-xs font-bold text-[#18181B] bg-[#FFE873] px-2.5 py-1 rounded-full border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B] flex items-center gap-1">
              <Crown className="w-3 h-3 stroke-[2.25]" />
              <span>Top 3 Open</span>
            </span>
          )}
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
            {doneCount} Done
          </span>
        </div>
      </div>

      {/* 2. Search & Quick Add */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search backlog..."
            className="w-full pl-10 pr-4 py-2 bg-white border-[1.75px] border-[#18181B] rounded-xl text-xs font-medium text-[#18181B] placeholder:text-slate-400 shadow-[1.5px_1.5px_0px_#18181B] focus:outline-none"
          />
        </div>

        <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add new backlog task..."
            className="flex-1 px-3.5 py-2 bg-white border-[1.75px] border-[#18181B] rounded-xl text-xs font-medium text-[#18181B] placeholder:text-slate-400 shadow-[1.5px_1.5px_0px_#18181B] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="px-3.5 py-2 bg-[#E8DCFF] neo-btn text-xs text-[#18181B] cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* 3. Category Filter Chips & Status Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1">
          {['all', 'code', 'design', 'learn', 'health'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                playClickSound();
                setSelectedCategory(cat);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border-[1.5px] ${
                selectedCategory === cat
                  ? 'bg-[#18181B] text-white border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#18181B]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(['all', 'active', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                playClickSound();
                setFilter(f);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                filter === f ? 'bg-[#FFE873] text-[#18181B] font-extrabold' : 'text-slate-400 hover:text-[#18181B]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="neo-card p-8 text-center bg-white border-dashed space-y-2">
            <Archive className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold font-display text-slate-500">
              No tasks found
            </h4>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`neo-card p-3.5 flex items-center justify-between gap-3 bg-white transition-all ${
                task.isCompleted ? 'opacity-70 bg-slate-50' : 'hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handleCheck(task)}
                  className={`w-6 h-6 rounded-md border-[1.75px] border-[#18181B] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    task.isCompleted ? 'bg-[#D1FBE4] text-[#18181B]' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  {task.isCompleted && <Check className="w-4 h-4 stroke-[2.5]" />}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs sm:text-sm font-bold block truncate text-[#18181B] ${
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                      {getCategoryIcon(task.category)}
                      {task.category || 'general'}
                    </span>
                    {task.subtasks && task.subtasks.length > 0 && (
                      <>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] font-bold text-slate-600">
                          {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length} steps
                        </span>
                      </>
                    )}
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-[10px] text-slate-500 font-mono-num">
                      {task.estimatedMinutes || 30}m
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!task.isCompleted && canPromoteToPriority && (
                  <button
                    onClick={() => handlePromote(task)}
                    title="Promote to Today Top 3"
                    className="px-2.5 py-1 bg-[#FFE873] hover:bg-[#FCD34D] text-[#18181B] border-[1.5px] border-[#18181B] rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#18181B]"
                  >
                    <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                    <span>Top 3</span>
                  </button>
                )}

                {task.id && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onDeleteTask(task.id!);
                    }}
                    title="Delete"
                    className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-400 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
