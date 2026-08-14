import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowUp,
  Trash2,
  Lightbulb,
  Check,
  Code,
  Palette,
  BookOpen,
  Activity,
  Archive,
  Crown,
  CheckCircle2,
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

const QUICK_IDEA_TEMPLATES = [
  { title: 'Code Refactor & Clean Code', category: 'code', minutes: 45, icon: <Code className="w-4 h-4 text-purple-900 stroke-[2.25]" /> },
  { title: 'Design System & Icon Polish', category: 'design', minutes: 30, icon: <Palette className="w-4 h-4 text-orange-950 stroke-[2.25]" /> },
  { title: 'Read 20 pages of Tech Book', category: 'learn', minutes: 25, icon: <BookOpen className="w-4 h-4 text-sky-950 stroke-[2.25]" /> },
  { title: 'Stretch & Posture Session', category: 'health', minutes: 15, icon: <Activity className="w-4 h-4 text-lime-950 stroke-[2.25]" /> },
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
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quickTitle, setQuickTitle] = useState('');

  // Stats
  const activeCount = backlogTasks.filter((t) => !t.isCompleted).length;
  const doneCount = backlogTasks.filter((t) => t.isCompleted).length;
  const totalEstimatedMins = useMemo(() => {
    return backlogTasks
      .filter((t) => !t.isCompleted)
      .reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
  }, [backlogTasks]);

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
          colors: ['#C084FC', '#BEF264', '#FED7AA'],
        });
      }, 100);
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    playClickSound();
    onQuickAddTask(quickTitle.trim());
    setQuickTitle('');
  };

  const handleAddTemplate = (template: typeof QUICK_IDEA_TEMPLATES[0]) => {
    playSuccessChime();
    onQuickAddTask(template.title, template.category, template.minutes);
  };

  const handlePromote = (task: Task) => {
    playSuccessChime();
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FEF08A', '#C084FC', '#BEF264'],
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

  const getCategoryDetails = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'design':
      case 'ui':
        return { bg: '#FED7AA', icon: <Palette className="w-5 h-5 text-orange-950 stroke-[2.25]" />, label: 'Design' };
      case 'learn':
        return { bg: '#BAE6FD', icon: <BookOpen className="w-5 h-5 text-sky-950 stroke-[2.25]" />, label: 'Learn' };
      case 'health':
      case 'fitness':
        return { bg: '#BEF264', icon: <Activity className="w-5 h-5 text-lime-950 stroke-[2.25]" />, label: 'Health' };
      case 'code':
      case 'dev':
      default:
        return { bg: '#E9D5FF', icon: <Code className="w-5 h-5 text-purple-950 stroke-[2.25]" />, label: 'Dev' };
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-28 font-body select-none">
      
      {/* 1. Vault Metrics Overview Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[1.75rem] p-3 shadow-[2px_2px_0px_#18181B] text-center space-y-0.5">
          <div className="w-8 h-8 rounded-full bg-[#E9D5FF] border border-[#18181B] flex items-center justify-center mx-auto text-xs shadow-2xs">
            <Archive className="w-4 h-4 text-purple-950 stroke-[2.25]" />
          </div>
          <p className="text-sm font-black font-mono-num text-[#18181B]">
            {activeCount}
          </p>
          <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
            In Vault
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[1.75rem] p-3 shadow-[2px_2px_0px_#18181B] text-center space-y-0.5">
          <div className="w-8 h-8 rounded-full bg-[#FEF08A] border border-[#18181B] flex items-center justify-center mx-auto text-xs shadow-2xs">
            <Crown className="w-4 h-4 text-amber-950 stroke-[2.25]" />
          </div>
          <p className="text-sm font-black font-mono-num text-[#18181B]">
            ~{(totalEstimatedMins / 60).toFixed(1)}h
          </p>
          <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
            Workload
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[1.75rem] p-3 shadow-[2px_2px_0px_#18181B] text-center space-y-0.5">
          <div className="w-8 h-8 rounded-full bg-[#BEF264] border border-[#18181B] flex items-center justify-center mx-auto text-xs shadow-2xs">
            <Check className="w-4 h-4 text-lime-950 stroke-[3]" />
          </div>
          <p className="text-sm font-black font-mono-num text-[#18181B]">
            {doneCount}
          </p>
          <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
            Done
          </p>
        </div>
      </div>

      {/* 2. Top Header & Search Capsule */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-full px-4 py-2.5 shadow-[2px_2px_0px_#18181B] flex items-center gap-2.5">
        <Search className="w-4 h-4 text-slate-400 stroke-[2.5] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search task vault..."
          className="w-full text-xs font-bold bg-transparent outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-[10px] font-black text-slate-400 hover:text-[#18181B] px-1.5 py-0.5 rounded-full bg-slate-100 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* 3. Quick Add Capsule */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-full p-1.5 shadow-[2px_2px_0px_#18181B] flex items-center gap-2"
      >
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add side quest or backlog idea..."
          className="flex-1 pl-4 pr-2 py-2 text-xs font-bold bg-transparent outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!quickTitle.trim()}
          className="w-10 h-10 rounded-full bg-[#C084FC] hover:bg-[#B366FA] disabled:opacity-40 text-[#18181B] border-[1.5px] border-[#18181B] flex items-center justify-center shadow-xs active:translate-y-0.5 cursor-pointer shrink-0 transition-all"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
        </button>
      </form>

      {/* 4. Quick Starter Templates (1-Tap Idea Spark) */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 px-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-400 stroke-[2.25]" />
          <span className="text-[10px] font-black font-display uppercase tracking-wider text-slate-500">
            Quick Idea Spark (1-Tap Add)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_IDEA_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => handleAddTemplate(tmpl)}
              className="p-2.5 bg-white/90 hover:bg-white border border-[#18181B]/15 hover:border-[#18181B] rounded-2xl flex items-center justify-between text-left shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                {tmpl.icon}
                <span className="text-[10px] font-extrabold text-[#18181B] truncate">
                  {tmpl.title}
                </span>
              </div>
              <span className="w-5 h-5 rounded-full bg-slate-50 group-hover:bg-[#E9D5FF] border border-[#18181B]/20 flex items-center justify-center text-[10px] font-black shrink-0 ml-1">
                +
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Filter Pills & Category Filters */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-2">
          <div className="flex gap-1.5">
            {(['all', 'active', 'done'] as const).map((f) => {
              const count = backlogTasks.filter((t) =>
                f === 'all' ? true : f === 'active' ? !t.isCompleted : t.isCompleted
              ).length;

              return (
                <button
                  key={f}
                  onClick={() => {
                    playClickSound();
                    setFilter(f);
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                    filter === f
                      ? 'bg-[#18181B] text-white shadow-[1px_1px_0px_#C084FC]'
                      : 'bg-white text-slate-500 border border-[#18181B]/15 hover:border-[#18181B]'
                  }`}
                >
                  {f} ({count})
                </button>
              );
            })}
          </div>

          {canPromoteToPriority && (
            <span className="text-[10px] font-black text-purple-900 bg-[#E9D5FF] px-2.5 py-0.5 rounded-full border border-[#18181B] shadow-2xs flex items-center gap-1">
              <Crown className="w-3 h-3 stroke-[2.25]" />
              <span>Top 3 Open</span>
            </span>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          {['all', 'code', 'design', 'learn', 'health'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                playClickSound();
                setSelectedCategory(cat);
              }}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shrink-0 border ${
                selectedCategory === cat
                  ? 'bg-[#C084FC] text-[#18181B] border-[#18181B] shadow-2xs'
                  : 'bg-white/80 text-slate-400 border-slate-200 hover:border-[#18181B]'
              }`}
            >
              {cat === 'all' ? 'All Tags' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 6. List of Pillowy Task Capsules */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-white/90 border-[1.5px] border-dashed border-slate-300 rounded-[2rem] p-6 text-center shadow-xs space-y-1.5">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-slate-200 flex items-center justify-center mx-auto text-base">
              <Archive className="w-6 h-6 text-slate-400 stroke-[2.25]" />
            </div>
            <h4 className="text-xs font-black font-display text-[#18181B]">
              No tasks in this view
            </h4>
            <p className="text-[11px] font-medium text-slate-500 max-w-xs mx-auto">
              {searchQuery ? 'Try another search keyword.' : 'Tap any starter idea above or type a new task.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const cat = getCategoryDetails(task.category);

            return (
              <div
                key={task.id}
                className={`bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2rem] p-3 shadow-[2px_2px_0px_#18181B] flex items-center justify-between gap-3 transition-all ${
                  task.isCompleted ? 'opacity-80 bg-slate-50/80' : 'hover:-translate-y-0.5'
                }`}
              >
                {/* Left: Lucide Avatar Badge + Checkbox + Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleCheck(task)}
                    className={`w-11 h-11 rounded-full border-[1.75px] border-[#18181B] flex items-center justify-center shrink-0 shadow-2xs text-sm cursor-pointer transition-colors ${
                      task.isCompleted ? 'bg-[#BEF264]' : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: task.isCompleted ? '#BEF264' : cat.bg,
                    }}
                    title={task.isCompleted ? 'Mark as incomplete' : 'Mark as done'}
                  >
                    {task.isCompleted ? <Check className="w-5 h-5 stroke-[3] text-lime-950" /> : cat.icon}
                  </button>

                  <div className="min-w-0 flex-1">
                    <h4
                      onClick={() => handleCheck(task)}
                      className={`text-xs font-extrabold truncate cursor-pointer select-none ${
                        task.isCompleted ? 'line-through text-slate-400' : 'text-[#18181B]'
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        {cat.label}
                      </span>
                      {task.estimatedMinutes && (
                        <span className="text-[9px] font-black text-purple-700 font-mono-num">
                          ~{task.estimatedMinutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!task.isCompleted && canPromoteToPriority && (
                    <button
                      onClick={() => handlePromote(task)}
                      title="Promote to Today's Top 3"
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#E9D5FF] text-[#18181B] border-[1.25px] border-[#18181B] rounded-full text-[10px] font-black hover:bg-[#D8B4FE] transition-all shadow-xs cursor-pointer active:translate-y-0.5"
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
                      title="Delete task"
                      className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-rose-50 border border-slate-200 hover:border-rose-400 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.25]" />
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
