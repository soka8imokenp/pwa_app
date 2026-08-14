import React, { useState } from 'react';
import { ListTodo, Plus, ArrowUpCircle, Trash2, Check, Sparkles } from 'lucide-react';
import type { Task } from '../../types';
import { BrutalCard } from '../common/BrutalCard';
import { BrutalButton } from '../common/BrutalButton';
import { BrutalBadge } from '../common/BrutalBadge';
import { playTaskCheckSound, playClickSound } from '../../lib/sound';

interface TaskBacklogProps {
  backlogTasks: Task[];
  canPromoteToPriority: boolean;
  onToggleComplete: (task: Task) => void;
  onPromoteToPriority: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onQuickAddTask: (title: string) => void;
}

export const TaskBacklog: React.FC<TaskBacklogProps> = ({
  backlogTasks,
  canPromoteToPriority,
  onToggleComplete,
  onPromoteToPriority,
  onDeleteTask,
  onQuickAddTask,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAddTask(quickTitle.trim());
    setQuickTitle('');
    playClickSound();
  };

  const handleCheck = (task: Task) => {
    playTaskCheckSound();
    onToggleComplete(task);
  };

  const filteredTasks = backlogTasks.filter((t) => {
    if (filter === 'active') return !t.isCompleted;
    if (filter === 'done') return t.isCompleted;
    return true;
  });

  const getBadgeVariant = (cat?: string) => {
    switch (cat) {
      case 'code':
        return 'lavender';
      case 'design':
        return 'peach';
      case 'health':
        return 'lime';
      case 'learn':
        return 'sky';
      default:
        return 'slate';
    }
  };

  return (
    <BrutalCard variant="milk" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#1E1B4B]/10 dark:border-purple-300/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#E9D5FF] dark:bg-[#381E68] border-2 border-[#1E1B4B] dark:border-purple-300 rounded-xl shadow-[2px_2px_0px_#1E1B4B]">
            <ListTodo className="w-5 h-5 text-purple-950 dark:text-purple-100" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-purple-50 tracking-tight">
              Task Backlog & Side Quests
            </h3>
            <p className="text-xs font-bold text-slate-600 dark:text-purple-300">
              Secondary tasks to tackle after your Top-3 outcomes
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 bg-[#FAF5FF] dark:bg-[#201A33] p-1 border-2 border-[#1E1B4B] dark:border-purple-300 rounded-xl">
          {(['all', 'active', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs font-black uppercase rounded-lg transition-all ${
                filter === f
                  ? 'bg-[#C084FC] text-slate-950 border border-[#1E1B4B] dark:bg-[#A855F7] dark:text-white'
                  : 'text-slate-600 dark:text-purple-300 hover:text-slate-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Quick add secondary task (e.g. Reply to emails)..."
          className="flex-1 px-4 py-2.5 bg-white dark:bg-[#1C182E] text-slate-900 dark:text-purple-100 brutal-input text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-purple-400/60"
        />
        <BrutalButton type="submit" variant="primary" size="md" className="shrink-0 flex items-center gap-1">
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </BrutalButton>
      </form>

      {/* Task List */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-[#1E1B4B]/20 dark:border-purple-300/20 rounded-2xl">
            <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-bold text-slate-500 dark:text-purple-300">
              No tasks found in backlog. Use quick add above to queue one!
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 border-[#1E1B4B] dark:border-purple-300 transition-all ${
                task.isCompleted
                  ? 'bg-slate-50/70 dark:bg-[#181528]/60 opacity-75 shadow-[1.5px_1.5px_0px_#1E1B4B]'
                  : 'bg-white dark:bg-[#1B182C] shadow-[2.5px_2.5px_0px_#1E1B4B] dark:shadow-[2.5px_2.5px_0px_#7E22CE] hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => handleCheck(task)}
                  className={`w-5 h-5 rounded-md border-2 border-[#1E1B4B] dark:border-purple-200 flex items-center justify-center shrink-0 transition-colors ${
                    task.isCompleted
                      ? 'bg-[#A3E635] text-slate-950'
                      : 'bg-white dark:bg-[#2A2242] hover:bg-purple-100'
                  }`}
                >
                  {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    onClick={() => handleCheck(task)}
                    className={`text-xs font-bold truncate cursor-pointer select-none ${
                      task.isCompleted
                        ? 'line-through text-slate-400 dark:text-purple-400'
                        : 'text-slate-800 dark:text-purple-100'
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.category && (
                    <BrutalBadge variant={getBadgeVariant(task.category)} size="sm">
                      {task.category}
                    </BrutalBadge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!task.isCompleted && canPromoteToPriority && (
                  <button
                    onClick={() => onPromoteToPriority(task)}
                    title="Promote to Top 3 Priority"
                    className="flex items-center gap-1 px-2 py-1 bg-[#FEF08A] dark:bg-[#3F330D] text-slate-950 dark:text-yellow-200 border border-[#1E1B4B] rounded-lg text-[11px] font-black hover:bg-yellow-300 transition-all shadow-[1px_1px_0px_#1E1B4B]"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-yellow-300" />
                    <span>Top 3</span>
                  </button>
                )}

                {task.id && (
                  <button
                    onClick={() => onDeleteTask(task.id!)}
                    title="Delete task"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </BrutalCard>
  );
};
