import React, { useState, useEffect, useRef } from 'react';
import {
  ListChecks,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Mic,
  MicOff,
  Sparkles,
  Star,
  Send,
  Flame,
  Lightbulb,
  Repeat,
  Layers,
  Filter,
} from 'lucide-react';
import { playClickSound, playSuccessChime, playTaskCheckSound } from '../../lib/sound';
import { startVoiceDictation, stopVoiceDictation, isSpeechRecognitionSupported } from '../../lib/speechRecognition';
import confetti from 'canvas-confetti';
import type { Task } from '../../types';

export type ChecklistTag = 'general' | 'urgent' | 'idea' | 'routine';
export type ChecklistFilter = 'all' | 'active' | 'completed';

export interface QuickChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  isStarred?: boolean;
  tag?: ChecklistTag;
  createdAt: number;
}

interface QuickChecklistCardProps {
  selectedDate?: string;
  onQuickCreateTask?: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<any>;
}

const TAG_CONFIG: Record<ChecklistTag, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  general: { label: 'General', bg: '#FAF7F2', color: '#18181B', icon: <Layers className="w-2.5 h-2.5" /> },
  urgent: { label: 'Urgent', bg: '#FED7AA', color: '#9A3412', icon: <Flame className="w-2.5 h-2.5" /> },
  idea: { label: 'Idea', bg: '#FEF08A', color: '#854D0E', icon: <Lightbulb className="w-2.5 h-2.5" /> },
  routine: { label: 'Routine', bg: '#E8DCFF', color: '#6B21A8', icon: <Repeat className="w-2.5 h-2.5" /> },
};

export const QuickScratchpadCard: React.FC<QuickChecklistCardProps> = ({
  selectedDate,
  onQuickCreateTask,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<ChecklistFilter>('all');
  const [selectedTag, setSelectedTag] = useState<ChecklistTag>('general');
  const [inputText, setInputText] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load items from localStorage
  const [items, setItems] = useState<QuickChecklistItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kairo_quick_checklist_v3');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: '1', text: 'Morning coffee & review top 3 priorities', isCompleted: true, isStarred: true, tag: 'routine', createdAt: Date.now() - 3600000 },
      { id: '2', text: 'Quick inbox zero & team check-in', isCompleted: false, isStarred: false, tag: 'general', createdAt: Date.now() - 1800000 },
      { id: '3', text: 'Fix critical bug in deployment pipeline', isCompleted: false, isStarred: true, tag: 'urgent', createdAt: Date.now() - 900000 },
    ];
  });

  // Save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_quick_checklist_v3', JSON.stringify(items));
    }
  }, [items]);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2500);
  };

  // Calculations
  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  // Add Item
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    playClickSound();
    const newItem: QuickChecklistItem = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isCompleted: false,
      isStarred: selectedTag === 'urgent',
      tag: selectedTag,
      createdAt: Date.now(),
    };

    setItems([newItem, ...items]);
    setInputText('');
  };

  // Toggle Complete
  const handleToggleItem = (id: string) => {
    playTaskCheckSound();
    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const nextCompleted = !item.isCompleted;
          if (nextCompleted && completedCount + 1 === totalCount) {
            playSuccessChime();
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.75 },
              colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
            });
          }
          return { ...item, isCompleted: nextCompleted };
        }
        return item;
      });
      return updated;
    });
  };

  // Toggle Star / Pin
  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isStarred: !item.isStarred } : item
      )
    );
  };

  // Delete Item
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear Completed
  const handleClearCompleted = () => {
    if (completedCount === 0) return;
    playClickSound();
    setItems((prev) => prev.filter((item) => !item.isCompleted));
    showToast(`Cleared ${completedCount} completed items`);
  };

  // Promote single item to Today Tasks
  const handlePromoteToTask = async (item: QuickChecklistItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onQuickCreateTask) return;

    playClickSound();
    await onQuickCreateTask({
      title: item.text,
      date: selectedDate || new Date().toISOString().slice(0, 10),
      isPriority: !!item.isStarred || item.tag === 'urgent',
      isCompleted: false,
      category: item.tag === 'urgent' ? 'code' : 'general',
      estimatedMinutes: item.tag === 'urgent' ? 45 : 25,
    });

    handleDeleteItem(item.id, e);
    playSuccessChime();
    showToast('Promoted to Today Tasks!');
  };

  // Import all pending to Today Tasks
  const handleImportAllPending = async () => {
    if (!onQuickCreateTask) return;
    const pending = items.filter((i) => !i.isCompleted);
    if (pending.length === 0) {
      showToast('No pending items to import');
      return;
    }

    playClickSound();
    for (const item of pending) {
      await onQuickCreateTask({
        title: item.text,
        date: selectedDate || new Date().toISOString().slice(0, 10),
        isPriority: !!item.isStarred || item.tag === 'urgent',
        isCompleted: false,
        category: item.tag === 'urgent' ? 'code' : 'general',
        estimatedMinutes: 25,
      });
    }

    playSuccessChime();
    confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 } });
    showToast(`Imported ${pending.length} items to Tasks!`);
  };

  // Voice Dictation
  const handleToggleVoice = () => {
    playClickSound();
    if (isVoiceRecording) {
      stopVoiceDictation();
      setIsVoiceRecording(false);
    } else {
      if (!isSpeechRecognitionSupported()) {
        alert('Voice recognition not supported in this browser.');
        return;
      }
      setIsVoiceRecording(true);
      startVoiceDictation({
        onTranscript: (transcript) => {
          if (transcript) {
            setInputText(transcript);
          }
        },
        onEnd: () => setIsVoiceRecording(false),
        onError: () => setIsVoiceRecording(false),
      });
    }
  };

  // Filtered & Sorted items (Starred on top)
  const filteredItems = items
    .filter((item) => {
      if (activeFilter === 'active') return !item.isCompleted;
      if (activeFilter === 'completed') return item.isCompleted;
      return true;
    })
    .sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return b.createdAt - a.createdAt;
    });

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3 font-body">
      
      {/* Header with Title, Progress & Expand/Collapse */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => {
            playClickSound();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none flex-1"
        >
          <div
            className="w-8 h-8 rounded-xl border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs transition-colors"
            style={{ backgroundColor: isAllDone ? '#D1FBE4' : '#E8DCFF' }}
          >
            {isAllDone ? (
              <Sparkles className="w-4 h-4 text-emerald-700 stroke-[2.25]" />
            ) : (
              <ListChecks className="w-4 h-4 text-purple-900 stroke-[2.25]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                Quick Checklist
              </h3>
              {totalCount > 0 && (
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border border-[#18181B] shadow-2xs font-mono-num ${
                    isAllDone ? 'bg-[#D1FBE4] text-emerald-900' : 'bg-[#FFE873] text-[#18181B]'
                  }`}
                >
                  {completedCount}/{totalCount}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-bold">
              {totalCount === 0
                ? 'Keep track of fast sub-goals & routine'
                : isAllDone
                ? 'All done! You are crushing it!'
                : `${totalCount - completedCount} items remaining (${progressPercent}%)`}
            </p>
          </div>
        </div>

        {/* Action Notice / Toggle */}
        <div className="flex items-center gap-1.5 select-none">
          {actionNotice && (
            <span className="text-[9px] font-black text-emerald-800 bg-[#D1FBE4] border border-[#18181B] px-2 py-0.5 rounded-lg shadow-2xs animate-in fade-in">
              {actionNotice}
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsExpanded(!isExpanded);
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
            className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full h-2 bg-[#FAF7F2] border-[1.25px] border-[#18181B] rounded-full overflow-hidden shadow-2xs">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: isAllDone ? '#4ADE80' : '#FFE873',
            }}
          />
        </div>
      )}

      {isExpanded && (
        <div className="space-y-3 animate-in fade-in duration-150">
          
          {/* Quick Input Bar */}
          <form onSubmit={handleAddItem} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Add a quick checklist item..."
                  className="w-full pl-3 pr-8 py-2 bg-[#FAF7F2] focus:bg-white border-[1.5px] border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] placeholder:text-slate-400 outline-none shadow-2xs focus:shadow-[2px_2px_0px_#18181B] transition-all"
                />
                
                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  title="Voice input"
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg border text-slate-700 active:scale-90 transition-all cursor-pointer ${
                    isVoiceRecording
                      ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                      : 'bg-white hover:bg-slate-100 border-[#18181B]/30'
                  }`}
                >
                  {isVoiceRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-rose-500" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3.5 py-2 bg-[#FFE873] hover:bg-[#FED7AA] disabled:opacity-40 border-[1.5px] border-[#18181B] rounded-xl text-xs font-black text-[#18181B] flex items-center gap-1 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add</span>
              </button>
            </div>

            {/* Quick Tag Selector Chips */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none select-none">
              <span className="text-[9px] font-black uppercase text-slate-400 pr-1 shrink-0">
                Tag:
              </span>
              {(Object.keys(TAG_CONFIG) as ChecklistTag[]).map((tagKey) => {
                const cfg = TAG_CONFIG[tagKey];
                const isSelected = selectedTag === tagKey;
                return (
                  <button
                    key={tagKey}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedTag(tagKey);
                    }}
                    className={`px-2 py-0.5 rounded-lg border text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'border-[#18181B] shadow-2xs ring-1 ring-[#18181B]'
                        : 'border-[#18181B]/20 opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </form>

          {/* Filter Pills */}
          {items.length > 0 && (
            <div className="flex items-center justify-between pt-1 select-none">
              <div className="flex items-center gap-1">
                {(['all', 'active', 'completed'] as ChecklistFilter[]).map((f) => {
                  const count =
                    f === 'all'
                      ? items.length
                      : f === 'active'
                      ? items.filter((i) => !i.isCompleted).length
                      : items.filter((i) => i.isCompleted).length;

                  const isActive = activeFilter === f;

                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setActiveFilter(f);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-black capitalize transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#18181B] text-white border border-[#18181B] shadow-2xs'
                          : 'bg-[#FAF7F2] text-slate-500 hover:text-slate-800 border border-[#18181B]/15'
                      }`}
                    >
                      {f} ({count})
                    </button>
                  );
                })}
              </div>

              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-[9px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Clear done</span>
                </button>
              )}
            </div>
          )}

          {/* Checklist Items Container */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center border-[1.5px] border-dashed border-[#18181B]/20 rounded-xl bg-[#FAF7F2] space-y-1">
                <ListChecks className="w-5 h-5 text-slate-300 mx-auto stroke-[1.5]" />
                <p className="text-[11px] font-bold text-slate-400">
                  {activeFilter === 'completed'
                    ? 'No completed items yet.'
                    : activeFilter === 'active'
                    ? 'All items are completed! Great job!'
                    : 'No checklist items yet. Add one above!'}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const tagConfig = item.tag ? TAG_CONFIG[item.tag] : TAG_CONFIG.general;

                return (
                  <div
                    key={item.id}
                    className={`group flex items-center justify-between gap-2 p-2 rounded-xl border-[1.5px] border-[#18181B] shadow-2xs transition-all ${
                      item.isCompleted
                        ? 'bg-slate-50 opacity-65 border-[#18181B]/40'
                        : item.isStarred
                        ? 'bg-[#FEFCE8]'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox & Text */}
                    <div
                      onClick={() => handleToggleItem(item.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                    >
                      <div
                        className={`w-4.5 h-4.5 rounded-lg border-[1.5px] border-[#18181B] flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                          item.isCompleted ? 'bg-[#18181B] text-white shadow-2xs' : 'bg-white hover:bg-slate-100'
                        }`}
                      >
                        {item.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className={`text-xs font-bold leading-snug break-words ${
                            item.isCompleted ? 'line-through text-slate-400' : 'text-[#18181B]'
                          }`}
                        >
                          {item.text}
                        </span>

                        {item.tag && item.tag !== 'general' && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.2 rounded border border-[#18181B]/20"
                              style={{ backgroundColor: tagConfig.bg, color: tagConfig.color }}
                            >
                              {tagConfig.icon}
                              <span>{tagConfig.label}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Star, Promote, Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Star Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(item.id, e)}
                        title={item.isStarred ? 'Unstar' : 'Pin to top'}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          item.isStarred
                            ? 'text-amber-500 bg-amber-50 border border-amber-300 shadow-2xs'
                            : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isStarred ? 'fill-amber-400' : ''}`} />
                      </button>

                      {/* Promote to Task */}
                      {!item.isCompleted && onQuickCreateTask && (
                        <button
                          type="button"
                          onClick={(e) => handlePromoteToTask(item, e)}
                          title="Convert to Today Task"
                          className="px-2 py-1 bg-[#FFE873] hover:bg-[#FED7AA] border border-[#18181B] rounded-lg text-[9px] font-black text-[#18181B] flex items-center gap-0.5 shadow-2xs active:scale-95 cursor-pointer"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>Task</span>
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        title="Delete"
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          {items.length > 0 && onQuickCreateTask && (
            <div className="pt-2 border-t border-[#18181B]/15 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500">
                {items.filter((i) => !i.isCompleted).length} pending
              </span>

              {items.some((i) => !i.isCompleted) && (
                <button
                  type="button"
                  onClick={handleImportAllPending}
                  className="px-3 py-1.5 bg-[#E8DCFF] hover:bg-[#D8C4FF] border-[1.5px] border-[#18181B] rounded-xl text-[10px] font-black text-[#18181B] flex items-center gap-1 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Import All to Today Tasks</span>
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export const QuickChecklistCard = QuickScratchpadCard;
