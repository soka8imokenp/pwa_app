import React, { useState, useEffect, useRef } from 'react';
import {
  ListChecks,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Mic,
  MicOff,
  Star,
  Send,
  Flame,
  Lightbulb,
  Repeat,
  Layers,
} from 'lucide-react';
import { playClickSound, playSuccessChime, playTaskCheckSound } from '../../lib/sound';
import {
  startVoiceDictation,
  stopVoiceDictation,
  isSpeechRecognitionSupported,
  getVoiceLanguage,
  setVoiceLanguage,
  splitVoiceIntoTasks,
  VoiceLanguage,
} from '../../lib/speechRecognition';
import confetti from 'canvas-confetti';
import type { Task } from '../../types';

export type ChecklistTag = 'general' | 'urgent' | 'idea' | 'routine';

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
  general: { label: 'General', bg: '#F4F0EA', color: '#24201D', icon: <Layers className="w-2.5 h-2.5" /> },
  urgent: { label: 'Urgent', bg: '#F7E3DC', color: '#9A3412', icon: <Flame className="w-2.5 h-2.5" /> },
  idea: { label: 'Idea', bg: '#FBECCF', color: '#854D0E', icon: <Lightbulb className="w-2.5 h-2.5" /> },
  routine: { label: 'Routine', bg: '#DDE8DE', color: '#2D503C', icon: <Repeat className="w-2.5 h-2.5" /> },
};

const SLIDE_TABS = [
  { id: 0, label: 'Create' },
  { id: 1, label: 'Active' },
  { id: 2, label: 'Completed' },
];

export const QuickScratchpadCard: React.FC<QuickChecklistCardProps> = ({
  selectedDate,
  onQuickCreateTask,
}) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [selectedTag, setSelectedTag] = useState<ChecklistTag>('general');
  const [inputText, setInputText] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(() => getVoiceLanguage());
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cycleVoiceLang = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playClickSound();
    const order: VoiceLanguage[] = ['auto', 'ru-RU', 'en-US', 'ja-JP'];
    const nextIdx = (order.indexOf(voiceLang) + 1) % order.length;
    const nextLang = order[nextIdx];
    setVoiceLang(nextLang);
    setVoiceLanguage(nextLang);
  };

  // Touch swipe refs
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Load items from localStorage
  const [items, setItems] = useState<QuickChecklistItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kairo_quick_checklist_v3');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: '1', text: 'Morning tea & review top 3 outcomes', isCompleted: true, isStarred: true, tag: 'routine', createdAt: Date.now() - 3600000 },
      { id: '2', text: 'Quick inbox zero & team check-in', isCompleted: false, isStarred: false, tag: 'general', createdAt: Date.now() - 1800000 },
      { id: '3', text: 'Focus block on core project feature', isCompleted: false, isStarred: true, tag: 'urgent', createdAt: Date.now() - 900000 },
    ];
  });

  // Save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_quick_checklist_v3', JSON.stringify(items));
    }
  }, [items]);

  const activeItems = items.filter((i) => !i.isCompleted);
  const completedItems = items.filter((i) => i.isCompleted);
  const totalCount = items.length;
  const completedCount = completedItems.length;

  const goToSlide = (idx: number) => {
    if (idx < 0 || idx > 2) return;
    playClickSound();
    setCurrentSlide(idx);
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Go Next Slide
      if (currentSlide < 2) {
        goToSlide(currentSlide + 1);
      }
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Go Prev Slide
      if (currentSlide > 0) {
        goToSlide(currentSlide - 1);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Add Item (supports smart multi-task splitting from continuous voice dictation)
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    playClickSound();

    const parsedTasks = splitVoiceIntoTasks(text);
    if (parsedTasks.length > 1) {
      const newItems: QuickChecklistItem[] = parsedTasks.map((taskTitle, idx) => ({
        id: (Date.now() + idx).toString(),
        text: taskTitle,
        isCompleted: false,
        isStarred: false,
        tag: selectedTag,
        createdAt: Date.now() + idx,
      }));
      setItems((prev) => [...newItems, ...prev]);
      setActionNotice(`Added ${parsedTasks.length} items!`);
    } else {
      const newItem: QuickChecklistItem = {
        id: Date.now().toString(),
        text,
        isCompleted: false,
        isStarred: false,
        tag: selectedTag,
        createdAt: Date.now(),
      };
      setItems((prev) => [newItem, ...prev]);
      setActionNotice('Item saved to Active!');
    }

    setInputText('');
    setTimeout(() => setActionNotice(null), 1800);
    // Switch to active slide to view
    setCurrentSlide(1);
  };

  // Toggle Complete
  const handleToggleDone = (id: string) => {
    playTaskCheckSound();
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.isCompleted;
          if (nextState) {
            if (activeItems.length === 1) {
              playSuccessChime();
              confetti({
                particleCount: 45,
                spread: 55,
                origin: { y: 0.8 },
                colors: ['#3D6B52', '#E09F3E', '#C25E40'],
              });
            }
          }
          return { ...item, isCompleted: nextState };
        }
        return item;
      })
    );
  };

  // Toggle Star / Pin
  const handleToggleStar = (id: string) => {
    playClickSound();
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isStarred: !item.isStarred } : item))
    );
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    playClickSound();
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear Completed
  const handleClearCompleted = () => {
    playClickSound();
    setItems((prev) => prev.filter((item) => !item.isCompleted));
    setActionNotice('Completed items cleared');
    setTimeout(() => setActionNotice(null), 1800);
  };

  // Promote single item to Today Task
  const handlePromoteToTask = async (item: QuickChecklistItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onQuickCreateTask) return;

    playSuccessChime();
    const taskDate = selectedDate || new Date().toISOString().split('T')[0];
    const category: Task['category'] = item.tag === 'urgent' ? 'admin' : 'general';

    await onQuickCreateTask({
      title: item.text,
      category,
      estimatedMinutes: 25,
      isPriority: item.isStarred || false,
      isCompleted: false,
      date: taskDate,
    });

    handleDeleteItem(item.id);
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } });
    setActionNotice('Converted to Today Task!');
    setTimeout(() => setActionNotice(null), 2000);
  };

  // Import all active pending to Today Tasks
  const handleImportAllPending = async () => {
    if (!onQuickCreateTask || activeItems.length === 0) return;
    playSuccessChime();
    const taskDate = selectedDate || new Date().toISOString().split('T')[0];
    for (const item of activeItems) {
      const category: Task['category'] = item.tag === 'urgent' ? 'admin' : 'general';
      await onQuickCreateTask({
        title: item.text,
        category,
        estimatedMinutes: 25,
        isPriority: item.isStarred || false,
        isCompleted: false,
        date: taskDate,
      });
    }
    setItems((prev) => prev.filter((i) => i.isCompleted));
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setActionNotice(`Imported ${activeItems.length} tasks!`);
    setTimeout(() => setActionNotice(null), 2000);
  };

  // Voice Dictation
  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Voice dictation is supported in Chrome/Edge/Android.');
      return;
    }

    if (isVoiceRecording) {
      stopVoiceDictation();
      setIsVoiceRecording(false);
    } else {
      setIsVoiceRecording(true);
      startVoiceDictation({
        onTranscript: (text: string) => {
          setInputText(text);
        },
        onError: () => setIsVoiceRecording(false),
        onEnd: () => setIsVoiceRecording(false),
      }, {
        lang: voiceLang,
        continuous: true,
        autoPunctuate: true,
      });
    }
  };

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 font-body select-none">
      
      {/* Top Header with Tab Switcher */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#24201D]/15">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
            <ListChecks className="w-3.5 h-3.5 text-[#2D503C] stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
              Quick Scratchpad
            </h3>
          </div>
        </div>

        {/* 3 Top Category Pills (Create, Active, Completed) */}
        <div className="flex items-center gap-1 p-0.5 bg-[#F4F0EA] border border-[#24201D]/30 rounded-xl">
          {SLIDE_TABS.map((tab) => {
            const isActive = currentSlide === tab.id;
            const count = tab.id === 1 ? activeItems.length : tab.id === 2 ? completedCount : null;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goToSlide(tab.id)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-[#3D6B52] text-white border border-[#24201D] shadow-2xs'
                    : 'text-[#6B635B] hover:text-[#24201D]'
                }`}
              >
                <span>{tab.label}</span>
                {count !== null && count > 0 && (
                  <span className={`text-[9px] font-mono-num font-black px-1 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-[#24201D]'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="p-2 bg-[#DDE8DE] border border-[#24201D] rounded-xl text-center text-xs font-black text-[#2D503C] animate-in fade-in duration-150 shadow-2xs">
          {actionNotice}
        </div>
      )}

      {/* Swipeable Viewport */}
      <div
        className="overflow-hidden relative min-h-[160px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out w-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          
          {/* SLIDE 0: CREATE PANEL */}
          <div className="w-full shrink-0 pr-1 space-y-3">
            <form onSubmit={handleAddItem} className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type idea, task, or quick memo..."
                    className="w-full pl-3 pr-20 py-2.5 bg-[#F4F0EA] border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-[#A89F91] outline-none shadow-2xs"
                  />
                  
                  {/* Language switch badge & Voice Mic Button */}
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={cycleVoiceLang}
                      title={`Voice Recognition Language: ${voiceLang.toUpperCase()}. Tap to switch.`}
                      className="px-1.5 py-0.5 rounded bg-white hover:bg-stone-100 border border-[#24201D]/30 text-[9px] font-black font-mono-num text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      {voiceLang === 'auto' ? 'AUTO' : voiceLang.split('-')[0].toUpperCase()}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      title={isVoiceRecording ? 'Stop recording' : 'Voice input'}
                      className={`p-1 rounded-lg border text-stone-700 active:scale-90 transition-all cursor-pointer ${
                        isVoiceRecording
                          ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                          : 'bg-white hover:bg-stone-100 border-[#24201D]/30'
                      }`}
                    >
                      {isVoiceRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-[#C25E40]" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-4 py-2.5 bg-[#3D6B52] hover:bg-[#345B45] text-white disabled:opacity-40 border border-[#24201D] rounded-xl text-xs font-black flex items-center gap-1 shadow-[1.5px_1.5px_0px_#24201D] active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>

              {/* Tag Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none select-none">
                <span className="text-[10px] font-bold text-[#6B635B] pr-1 shrink-0">
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
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'border-[#24201D] shadow-2xs ring-1 ring-[#24201D]'
                          : 'border-[#24201D]/20 opacity-60 hover:opacity-100'
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
          </div>

          {/* SLIDE 1: ACTIVE ITEMS PANEL */}
          <div className="w-full shrink-0 px-0.5 space-y-2">
            {activeItems.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-[#24201D]/20 rounded-xl bg-[#F4F0EA] space-y-2">
                <p className="text-xs font-bold text-[#24201D]">All clear! No active items.</p>
                <button
                  type="button"
                  onClick={() => goToSlide(0)}
                  className="text-[11px] font-black text-[#3D6B52] underline cursor-pointer"
                >
                  + Add a new note or memo
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {activeItems.map((item) => {
                  const tagConfig = item.tag ? TAG_CONFIG[item.tag] : TAG_CONFIG.general;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#24201D] shadow-2xs transition-all ${
                        item.isStarred ? 'bg-[#FBECCF]/50' : 'bg-white'
                      }`}
                    >
                      {/* Checkbox & Text */}
                      <div
                        onClick={() => handleToggleDone(item.id)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-5 h-5 rounded-lg border border-[#24201D] bg-[#F4F0EA] flex items-center justify-center shrink-0 hover:bg-stone-200 transition-all">
                          <div className="w-2.5 h-2.5 rounded-sm bg-transparent" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-[#24201D] block break-words">
                            {item.text}
                          </span>
                          {item.tag && item.tag !== 'general' && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.2 rounded border border-[#24201D]/20 mt-0.5"
                              style={{ backgroundColor: tagConfig.bg, color: tagConfig.color }}
                            >
                              {tagConfig.icon}
                              <span>{tagConfig.label}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions: Star, Convert to Task, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleStar(item.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer ${
                            item.isStarred ? 'text-[#E09F3E]' : 'text-stone-300 hover:text-[#E09F3E]'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${item.isStarred ? 'fill-[#E09F3E]' : ''}`} />
                        </button>

                        {onQuickCreateTask && (
                          <button
                            type="button"
                            onClick={(e) => handlePromoteToTask(item, e)}
                            title="Convert to Today Task"
                            className="px-2 py-0.5 bg-[#F0BB58] hover:bg-[#E09F3E] border border-[#24201D] rounded-lg text-[9px] font-black text-[#24201D] flex items-center gap-0.5 shadow-2xs active:scale-95 cursor-pointer"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>Task</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-300 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Bulk Import */}
            {activeItems.length > 1 && onQuickCreateTask && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleImportAllPending}
                  className="px-3 py-1.5 bg-[#DDE8DE] hover:bg-[#CADBCF] border border-[#24201D] rounded-xl text-[10px] font-black text-[#2D503C] flex items-center gap-1 shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Import All to Today Tasks</span>
                </button>
              </div>
            )}
          </div>

          {/* SLIDE 2: COMPLETED PANEL */}
          <div className="w-full shrink-0 pl-1 space-y-2">
            {completedItems.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-[#24201D]/20 rounded-xl bg-[#F4F0EA] space-y-1">
                <p className="text-xs font-bold text-[#6B635B]">No completed items yet.</p>
                <p className="text-[10px] text-stone-400">Check off items in the Active tab to see them here.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#24201D]/30 bg-stone-50/80 opacity-75 shadow-2xs"
                  >
                    <div
                      onClick={() => handleToggleDone(item.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-lg border border-[#24201D] bg-[#3D6B52] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="text-xs font-bold line-through text-[#6B635B] truncate">
                        {item.text}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-300 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {completedItems.length > 0 && (
              <div className="pt-1 flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#6B635B]">
                  {completedCount} items completed
                </span>
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="px-2.5 py-1 text-[10px] font-bold text-stone-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Clear completed</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Bottom 3 Dots Pagination */}
      <div className="pt-2 border-t border-[#24201D]/15 flex items-center justify-center gap-2">
        {SLIDE_TABS.map((tab) => {
          const isSelected = currentSlide === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => goToSlide(tab.id)}
              title={`Go to ${tab.label}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                isSelected
                  ? 'w-6 h-2 bg-[#3D6B52] shadow-2xs'
                  : 'w-2 h-2 bg-[#24201D]/25 hover:bg-[#24201D]/50'
              }`}
            />
          );
        })}
      </div>

    </div>
  );
};

export const QuickChecklistCard = QuickScratchpadCard;
