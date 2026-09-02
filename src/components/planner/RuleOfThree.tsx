import React from 'react';
import confetti from 'canvas-confetti';
import { Star, Check, Plus, Play, Trash2, ArrowDownCircle } from 'lucide-react';
import type { Task } from '../../types';
import { BrutalButton } from '../common/BrutalButton';
import { BrutalBadge } from '../common/BrutalBadge';
import { playTaskCheckSound, playSuccessChime } from '../../lib/sound';

interface RuleOfThreeProps {
  priorityTasks: Task[];
  onToggleComplete: (task: Task) => void;
  onDemoteToBacklog: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onOpenAddTask: (prioritySlotIndex?: number) => void;
  onStartFocusOnTask: (task: Task) => void;
}

export const RuleOfThree: React.FC<RuleOfThreeProps> = ({
  priorityTasks,
  onToggleComplete,
  onDemoteToBacklog,
  onDeleteTask,
  onOpenAddTask,
  onStartFocusOnTask,
}) => {
  const completedCount = priorityTasks.filter((t) => t.isCompleted).length;
  const allCompleted = priorityTasks.length === 3 && completedCount === 3;

  const handleCheckboxClick = (task: Task) => {
    playTaskCheckSound();
    onToggleComplete(task);

    // If this completing action completes the 3rd task, trigger celebration!
    if (!task.isCompleted && completedCount === 2) {
      setTimeout(() => {
        playSuccessChime();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C084FC', '#A3E635', '#FACC15', '#FB7185', '#38BDF8'],
        });
      }, 100);
    }
  };

  const getCategoryBadgeVariant = (cat?: string) => {
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
        return 'yellow';
    }
  };

  // We ensure 3 visual slots
  const slots = [0, 1, 2];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#FBECCF] border-[1.75px] border-[#24201D] rounded-xl shadow-[1.5px_1.5px_0px_#24201D]">
            <Star className="w-5 h-5 text-[#D97706] fill-[#F59E0B]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#24201D] tracking-tight flex items-center gap-2">
              Rule of 3 • Daily Priorities
            </h2>
            <p className="text-xs font-bold text-[#6B635B]">
              Only 3 essential outcomes for maximum focus
            </p>
          </div>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-2">
          <BrutalBadge
            variant={allCompleted ? 'lime' : completedCount > 0 ? 'yellow' : 'slate'}
            size="md"
          >
            {completedCount}/3 COMPLETED
          </BrutalBadge>
        </div>
      </div>

      {/* 3 Bento Slot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slotIndex) => {
          const task = priorityTasks[slotIndex];

          if (task) {
            return (
              <div
                key={task.id || slotIndex}
                className={`relative border-[2px] border-[#24201D] rounded-2xl p-4.5 transition-all duration-200 flex flex-col justify-between min-h-[160px] ${
                  task.isCompleted
                    ? 'bg-[#EEF5F0]/90 shadow-[2.5px_2.5px_0px_#24201D] opacity-95'
                    : 'bg-white shadow-[3.5px_3.5px_0px_#24201D] hover:-translate-y-0.5'
                }`}
              >
                {/* Slot Number Pill & Category */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-lg bg-[#3D6B52] text-white border border-[#24201D] font-black text-xs flex items-center justify-center font-mono-num shadow-[1px_1px_0px_#24201D]">
                      #{slotIndex + 1}
                    </span>
                    <BrutalBadge variant={getCategoryBadgeVariant(task.category)} size="sm">
                      {task.category || 'Focus'}
                    </BrutalBadge>
                  </div>

                  {task.estimatedMinutes && (
                    <span className="text-[11px] font-bold text-[#6B635B] font-mono-num">
                      ~{task.estimatedMinutes}m
                    </span>
                  )}
                </div>

                {/* Task Title & Checkbox */}
                <div className="flex items-start gap-3 my-2">
                  <button
                    onClick={() => handleCheckboxClick(task)}
                    className={`mt-0.5 w-6 h-6 rounded-lg border-2 border-[#24201D] flex items-center justify-center transition-all cursor-pointer shadow-[1.5px_1.5px_0px_#24201D] ${
                      task.isCompleted
                        ? 'bg-[#3D6B52] text-white'
                        : 'bg-white hover:bg-[#F4F0EA]'
                    }`}
                    aria-label={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {task.isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <span
                    onClick={() => handleCheckboxClick(task)}
                    className={`text-sm font-extrabold cursor-pointer select-none leading-snug flex-1 ${
                      task.isCompleted
                        ? 'line-through text-stone-500 font-semibold'
                        : 'text-[#24201D]'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t-2 border-[#24201D]/10 mt-2">
                  <BrutalButton
                    variant="peach"
                    size="sm"
                    onClick={() => onStartFocusOnTask(task)}
                    className="text-[11px] py-1 px-2.5 flex items-center gap-1 shadow-[1.5px_1.5px_0px_#24201D]"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Focus</span>
                  </BrutalButton>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDemoteToBacklog(task)}
                      title="Move to Backlog"
                      className="p-1.5 rounded-lg text-stone-600 hover:text-[#24201D] hover:bg-stone-200/70 transition-colors"
                    >
                      <ArrowDownCircle className="w-4 h-4" />
                    </button>
                    {task.id && (
                      <button
                        onClick={() => onDeleteTask(task.id!)}
                        title="Delete Task"
                        className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Empty Slot Card
          return (
            <button
              key={`empty-${slotIndex}`}
              onClick={() => onOpenAddTask(slotIndex)}
              className="border-[2px] border-dashed border-[#24201D]/35 hover:border-[#24201D] bg-white/60 hover:bg-[#FAF8F5] rounded-2xl p-4.5 transition-all duration-200 flex flex-col items-center justify-center min-h-[160px] group cursor-pointer shadow-[1.5px_1.5px_0px_rgba(36,32,29,0.08)] hover:shadow-[3.5px_3.5px_0px_#24201D] text-center"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-[1.5px_1.5px_0px_#24201D]">
                <Plus className="w-5 h-5 text-[#24201D]" />
              </div>
              <span className="text-xs font-black text-[#24201D]">
                Priority Slot #{slotIndex + 1}
              </span>
              <span className="text-[11px] font-bold text-[#6B635B] mt-0.5">
                Click to add key outcome
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
