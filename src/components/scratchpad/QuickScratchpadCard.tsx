import React, { useState, useEffect, useRef } from 'react';
import {
  StickyNote,
  CheckSquare,
  Target,
  Calculator,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Mic,
  MicOff,
  Sparkles,
  Clock,
  Flame,
  Star,
  Zap,
  Lightbulb,
  Droplets,
  BookOpen,
  Send,
  ArrowRight,
  Minus,
} from 'lucide-react';
import { playClickSound, playSuccessChime, playTaskCheckSound } from '../../lib/sound';
import { startVoiceDictation, stopVoiceDictation, isSpeechRecognitionSupported } from '../../lib/speechRecognition';
import confetti from 'canvas-confetti';
import type { Task } from '../../types';

export type ScratchMode = 'notes' | 'checklist' | 'matrix' | 'counter';

interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

interface MatrixItem {
  id: string;
  text: string;
  quadrant: 'urgent' | 'important' | 'quick' | 'ideas';
}

interface TallyCounter {
  id: string;
  label: string;
  count: number;
  step: number;
  icon: 'water' | 'focus' | 'pages';
}

interface QuickScratchpadCardProps {
  selectedDate?: string;
  onQuickCreateTask?: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<any>;
}

export const QuickScratchpadCard: React.FC<QuickScratchpadCardProps> = ({
  selectedDate,
  onQuickCreateTask,
}) => {
  // Mode Selection
  const [mode, setMode] = useState<ScratchMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('kairo_scratchpad_active_mode') as ScratchMode) || 'notes';
    }
    return 'notes';
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // 1. Notes State
  const [noteColor, setNoteColor] = useState<string>('#FEF08A');
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_scratchpad_notes_v2') || '';
    }
    return '';
  });
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 2. Checklist State
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kairo_scratchpad_checklist_v2');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: '1', text: 'Review daily priorities', isCompleted: false },
      { id: '2', text: 'Quick email catch-up', isCompleted: true },
    ];
  });
  const [newChecklistText, setNewChecklistText] = useState('');

  // 3. Matrix State
  const [matrixItems, setMatrixItems] = useState<MatrixItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kairo_scratchpad_matrix_v2');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: 'm1', text: 'Critical bugfix', quadrant: 'urgent' },
      { id: 'm2', text: 'System architecture plan', quadrant: 'important' },
    ];
  });
  const [activeMatrixQuadrant, setActiveMatrixQuadrant] = useState<'urgent' | 'important' | 'quick' | 'ideas'>('urgent');
  const [newMatrixText, setNewMatrixText] = useState('');

  // 4. Counter & Math State
  const [tallies, setTallies] = useState<TallyCounter[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kairo_scratchpad_tallies_v2');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: 'water', label: 'Water Glasses', count: 4, step: 1, icon: 'water' },
      { id: 'focus', label: 'Focus Sprints', count: 2, step: 1, icon: 'focus' },
      { id: 'pages', label: 'Pages / Reps', count: 15, step: 5, icon: 'pages' },
    ];
  });
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState<string | null>(null);

  // Save changes to localStorage with debounced indicator
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSaving(true);
      localStorage.setItem('kairo_scratchpad_active_mode', mode);
      localStorage.setItem('kairo_scratchpad_notes_v2', notes);
      localStorage.setItem('kairo_scratchpad_checklist_v2', JSON.stringify(checklist));
      localStorage.setItem('kairo_scratchpad_matrix_v2', JSON.stringify(matrixItems));
      localStorage.setItem('kairo_scratchpad_tallies_v2', JSON.stringify(tallies));
      const timer = setTimeout(() => setIsSaving(false), 400);
      return () => clearTimeout(timer);
    }
  }, [mode, notes, checklist, matrixItems, tallies]);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2500);
  };

  const handleCopyText = (text: string) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    playSuccessChime();
    confetti({
      particleCount: 30,
      spread: 45,
      origin: { y: 0.7 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Mode 1: Notes Handlers ---
  const handleInsertNoteSnippet = (prefix: string) => {
    playClickSound();
    const textarea = textareaRef.current;
    if (!textarea) {
      setNotes((prev) => (prev ? `${prev}\n${prefix}` : prefix));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = notes.substring(0, start);
    const after = notes.substring(end);
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const insertString = needsNewline ? `\n${prefix}` : prefix;
    setNotes(before + insertString + after);
    setTimeout(() => {
      textarea.focus();
      const pos = start + insertString.length;
      textarea.setSelectionRange(pos, pos);
    }, 40);
  };

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
        onTranscript: (t) => {
          handleInsertNoteSnippet(t);
        },
        onEnd: () => setIsVoiceRecording(false),
        onError: () => setIsVoiceRecording(false),
      });
    }
  };

  // --- Mode 2: Checklist Handlers ---
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    playClickSound();
    setChecklist([
      ...checklist,
      { id: Date.now().toString(), text: newChecklistText.trim(), isCompleted: false },
    ]);
    setNewChecklistText('');
  };

  const handleToggleCheckItem = (id: string) => {
    playTaskCheckSound();
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const handleDeleteCheckItem = (id: string) => {
    playClickSound();
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleImportChecklistToTasks = async () => {
    if (!onQuickCreateTask) return;
    const pendingItems = checklist.filter((i) => !i.isCompleted);
    if (pendingItems.length === 0) {
      showToast('No pending items to import');
      return;
    }

    playClickSound();
    for (const item of pendingItems) {
      await onQuickCreateTask({
        title: item.text,
        date: selectedDate || new Date().toISOString().slice(0, 10),
        isPriority: false,
        isCompleted: false,
        category: 'general',
        estimatedMinutes: 25,
      });
    }

    playSuccessChime();
    confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 } });
    showToast(`Imported ${pendingItems.length} items to Tasks!`);
  };

  // --- Mode 3: Matrix Handlers ---
  const handleAddMatrixItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatrixText.trim()) return;
    playClickSound();
    setMatrixItems([
      ...matrixItems,
      { id: Date.now().toString(), text: newMatrixText.trim(), quadrant: activeMatrixQuadrant },
    ]);
    setNewMatrixText('');
  };

  const handleDeleteMatrixItem = (id: string) => {
    playClickSound();
    setMatrixItems(matrixItems.filter((i) => i.id !== id));
  };

  const handlePromoteMatrixItem = async (item: MatrixItem) => {
    if (!onQuickCreateTask) return;
    playClickSound();
    await onQuickCreateTask({
      title: item.text,
      date: selectedDate || new Date().toISOString().slice(0, 10),
      isPriority: item.quadrant === 'urgent' || item.quadrant === 'important',
      isCompleted: false,
      category: item.quadrant === 'urgent' ? 'health' : 'code',
      estimatedMinutes: item.quadrant === 'urgent' ? 15 : 45,
    });
    handleDeleteMatrixItem(item.id);
    playSuccessChime();
    showToast('Promoted to Today Tasks!');
  };

  // --- Mode 4: Tally & Math Handlers ---
  const handleUpdateTally = (id: string, delta: number) => {
    playClickSound();
    setTallies(
      tallies.map((t) =>
        t.id === id ? { ...t, count: Math.max(0, t.count + delta) } : t
      )
    );
  };

  const handleResetTally = (id: string) => {
    playClickSound();
    setTallies(tallies.map((t) => (t.id === id ? { ...t, count: 0 } : t)));
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Safe math eval with digits & operators only
      const sanitized = calcInput.replace(/[^0-9+\-*/(). ]/g, '');
      if (!sanitized) return;
      // eslint-disable-next-line no-eval
      const res = Function(`'use strict'; return (${sanitized})`)();
      setCalcResult(String(res));
      playSuccessChime();
    } catch {
      setCalcResult('Error');
    }
  };

  const MODES_CONFIG: { id: ScratchMode; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'notes', label: 'Memo', icon: <StickyNote className="w-3.5 h-3.5 stroke-[2.25]" />, color: '#FEF08A' },
    { id: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-3.5 h-3.5 stroke-[2.25]" />, color: '#E8DCFF' },
    { id: 'matrix', label: 'Priority Matrix', icon: <Target className="w-3.5 h-3.5 stroke-[2.25]" />, color: '#FED7AA' },
    { id: 'counter', label: 'Tally & Math', icon: <Calculator className="w-3.5 h-3.5 stroke-[2.25]" />, color: '#D1FBE4' },
  ];

  const currentModeConfig = MODES_CONFIG.find((m) => m.id === mode) || MODES_CONFIG[0];

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3 font-body">
      
      {/* Top Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => {
            playClickSound();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div
            className="w-8 h-8 rounded-xl border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs transition-colors"
            style={{ backgroundColor: currentModeConfig.color }}
          >
            {currentModeConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                Quick Workspace
              </h3>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500">
                <span className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                {isSaving ? 'Saving' : 'Saved'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold">
              {mode === 'notes' && `${notes.length} chars`}
              {mode === 'checklist' && `${checklist.filter((i) => i.isCompleted).length}/${checklist.length} done`}
              {mode === 'matrix' && `${matrixItems.length} matrix items`}
              {mode === 'counter' && 'Tallies & inline math'}
            </p>
          </div>
        </div>

        {/* Action / Toast Notice & Toggle */}
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
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" /> : <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 animate-in fade-in duration-150">
          
          {/* Functional Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 scrollbar-none select-none">
            {MODES_CONFIG.map((m) => {
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setMode(m.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl border-[1.5px] text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'border-[#18181B] text-[#18181B] shadow-2xs ring-1 ring-[#18181B]'
                      : 'bg-[#FAF7F2] border-[#18181B]/20 text-slate-500 hover:border-[#18181B] hover:bg-white'
                  }`}
                  style={{ backgroundColor: isActive ? m.color : undefined }}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* MODE 1: FREEFORM SMART MEMO                              */}
          {/* ======================================================== */}
          {mode === 'notes' && (
            <div className="space-y-2">
              {/* Quick Toolbar */}
              <div className="flex items-center justify-between gap-1 overflow-x-auto py-0.5 px-0.5 scrollbar-none select-none">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleInsertNoteSnippet('• ')}
                    className="px-2 py-1 bg-[#FAF7F2] hover:bg-white border border-[#18181B]/20 hover:border-[#18181B] rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Bullet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      handleInsertNoteSnippet(`[${timeStr}] `);
                    }}
                    className="px-2 py-1 bg-[#FAF7F2] hover:bg-white border border-[#18181B]/20 hover:border-[#18181B] rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-amber-700" />
                    <span>Time</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {/* Voice Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer ${
                      isVoiceRecording
                        ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                        : 'bg-[#FAF7F2] hover:bg-white border-[#18181B]/20 text-slate-700'
                    }`}
                  >
                    {isVoiceRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-rose-600" />}
                    <span>{isVoiceRecording ? 'Recording...' : 'Voice'}</span>
                  </button>

                  {notes.trim().length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyText(notes)}
                        title="Copy memo"
                        className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-[#FFE873] border border-[#18181B] flex items-center justify-center text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Clear current memo?')) {
                            playClickSound();
                            setNotes('');
                          }
                        }}
                        title="Clear memo"
                        className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-rose-50 border border-[#18181B]/40 hover:border-rose-500 flex items-center justify-center text-slate-400 hover:text-rose-600 shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type quick memos, brainstorm ideas, paste links or code..."
                className="w-full p-3 bg-[#FAF7F2] focus:bg-white text-xs font-mono font-medium rounded-xl border-[1.5px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-2xs focus:shadow-[2px_2px_0px_#18181B] transition-all resize-y leading-relaxed"
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 2: INTERACTIVE TASK CHECKLIST                       */}
          {/* ======================================================== */}
          {mode === 'checklist' && (
            <div className="space-y-2.5">
              {/* Quick Add Form */}
              <form onSubmit={handleAddChecklistItem} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Add quick checklist item..."
                  className="flex-1 px-3 py-2 bg-[#FAF7F2] focus:bg-white border-[1.5px] border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] placeholder:text-slate-400 outline-none shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!newChecklistText.trim()}
                  className="px-3 py-2 bg-[#E8DCFF] hover:bg-[#D8C4FF] disabled:opacity-40 border-[1.5px] border-[#18181B] rounded-xl text-xs font-black text-[#18181B] flex items-center gap-1 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add</span>
                </button>
              </form>

              {/* Checklist Items List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {checklist.length === 0 ? (
                  <p className="text-center text-[11px] font-bold text-slate-400 py-3 border border-dashed border-[#18181B]/20 rounded-xl">
                    No items in checklist yet.
                  </p>
                ) : (
                  checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 p-2 rounded-xl border-[1.5px] border-[#18181B] shadow-2xs transition-all ${
                        item.isCompleted ? 'bg-slate-50 opacity-70' : 'bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCheckItem(item.id)}
                        className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                      >
                        <div
                          className={`w-4 h-4 rounded border border-[#18181B] flex items-center justify-center shrink-0 ${
                            item.isCompleted ? 'bg-[#18181B] text-white' : 'bg-white'
                          }`}
                        >
                          {item.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={`text-xs font-bold text-[#18181B] ${item.isCompleted ? 'line-through text-slate-400' : ''}`}>
                          {item.text}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCheckItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Checklist Bottom Actions */}
              {checklist.length > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-[#18181B]/15">
                  <span className="text-[10px] font-bold text-slate-500">
                    {checklist.filter((i) => i.isCompleted).length} of {checklist.length} completed
                  </span>

                  {onQuickCreateTask && (
                    <button
                      type="button"
                      onClick={handleImportChecklistToTasks}
                      className="px-2.5 py-1 bg-[#FFE873] hover:bg-[#FED7AA] border border-[#18181B] rounded-lg text-[10px] font-black text-[#18181B] flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Import to Today Tasks</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 3: PRIORITY MATRIX (EISENHOWER)                     */}
          {/* ======================================================== */}
          {mode === 'matrix' && (
            <div className="space-y-2.5">
              {/* Quadrant Selector */}
              <div className="grid grid-cols-2 gap-1.5 select-none">
                {[
                  { id: 'urgent' as const, label: 'Urgent & Vital', color: '#FED7AA', icon: <Flame className="w-3 h-3 text-rose-600" /> },
                  { id: 'important' as const, label: 'Important Plan', color: '#FEF08A', icon: <Star className="w-3 h-3 text-amber-600" /> },
                  { id: 'quick' as const, label: 'Quick Delegate', color: '#E8DCFF', icon: <Zap className="w-3 h-3 text-purple-600" /> },
                  { id: 'ideas' as const, label: 'Someday / Ideas', color: '#D1FBE4', icon: <Lightbulb className="w-3 h-3 text-emerald-600" /> },
                ].map((q) => {
                  const count = matrixItems.filter((i) => i.quadrant === q.id).length;
                  const isSel = activeMatrixQuadrant === q.id;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setActiveMatrixQuadrant(q.id);
                      }}
                      className={`p-2 rounded-xl border-[1.5px] text-left transition-all cursor-pointer ${
                        isSel
                          ? 'border-[#18181B] shadow-2xs ring-1 ring-[#18181B]'
                          : 'border-[#18181B]/20 bg-[#FAF7F2] hover:border-[#18181B]'
                      }`}
                      style={{ backgroundColor: isSel ? q.color : undefined }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {q.icon}
                          <span className="text-[10px] font-black text-[#18181B]">{q.label}</span>
                        </div>
                        <span className="text-[9px] font-black font-mono-num bg-white/70 px-1.5 rounded-full border border-[#18181B]/20">
                          {count}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Add to Selected Quadrant */}
              <form onSubmit={handleAddMatrixItem} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newMatrixText}
                  onChange={(e) => setNewMatrixText(e.target.value)}
                  placeholder={`Add to "${activeMatrixQuadrant}"...`}
                  className="flex-1 px-3 py-2 bg-[#FAF7F2] focus:bg-white border-[1.5px] border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] placeholder:text-slate-400 outline-none shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!newMatrixText.trim()}
                  className="px-3 py-2 bg-[#FFE873] hover:bg-[#FED7AA] disabled:opacity-40 border-[1.5px] border-[#18181B] rounded-xl text-xs font-black text-[#18181B] flex items-center gap-1 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add</span>
                </button>
              </form>

              {/* Matrix Items for Active Quadrant */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                {matrixItems.filter((i) => i.quadrant === activeMatrixQuadrant).length === 0 ? (
                  <p className="text-center text-[11px] font-bold text-slate-400 py-3 border border-dashed border-[#18181B]/20 rounded-xl">
                    No items in this quadrant.
                  </p>
                ) : (
                  matrixItems
                    .filter((i) => i.quadrant === activeMatrixQuadrant)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border-[1.5px] border-[#18181B] shadow-2xs"
                      >
                        <span className="text-xs font-bold text-[#18181B] flex-1">{item.text}</span>

                        <div className="flex items-center gap-1">
                          {onQuickCreateTask && (
                            <button
                              type="button"
                              onClick={() => handlePromoteMatrixItem(item)}
                              title="Promote to Top Priority Task"
                              className="px-2 py-0.5 bg-[#FFE873] hover:bg-[#FED7AA] border border-[#18181B] rounded-lg text-[9px] font-black text-[#18181B] flex items-center gap-0.5 shadow-2xs cursor-pointer active:scale-95"
                            >
                              <ArrowRight className="w-2.5 h-2.5" />
                              <span>Promote</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteMatrixItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 4: TALLY COUNTERS & QUICK MATH                      */}
          {/* ======================================================== */}
          {mode === 'counter' && (
            <div className="space-y-3">
              {/* Tally Cards */}
              <div className="grid grid-cols-3 gap-2 select-none">
                {tallies.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-[#FAF7F2] border-[1.5px] border-[#18181B] rounded-xl shadow-2xs text-center space-y-1.5"
                  >
                    <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-600">
                      {t.icon === 'water' && <Droplets className="w-3 h-3 text-cyan-600" />}
                      {t.icon === 'focus' && <Flame className="w-3 h-3 text-amber-600" />}
                      {t.icon === 'pages' && <BookOpen className="w-3 h-3 text-purple-600" />}
                      <span className="truncate">{t.label}</span>
                    </div>

                    <div className="text-lg font-black font-mono-num text-[#18181B]">{t.count}</div>

                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateTally(t.id, -t.step)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateTally(t.id, t.step)}
                        className="w-6 h-6 rounded-lg bg-[#FFE873] hover:bg-[#FED7AA] border border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs active:scale-95 cursor-pointer font-black"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResetTally(t.id)}
                        title="Reset"
                        className="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 border border-[#18181B]/40 flex items-center justify-center text-slate-400 hover:text-rose-600 shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inline Quick Calculator */}
              <div className="p-2.5 bg-white border-[1.5px] border-[#18181B] rounded-xl space-y-2 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Quick Math Evaluator
                </span>
                <form onSubmit={handleCalculate} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={calcInput}
                    onChange={(e) => setCalcInput(e.target.value)}
                    placeholder="e.g. 120 + 45 * 2"
                    className="flex-1 px-3 py-1.5 bg-[#FAF7F2] focus:bg-white border border-[#18181B] rounded-xl text-xs font-mono font-bold text-[#18181B] outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#D1FBE4] hover:bg-[#A7F3D0] border border-[#18181B] rounded-xl text-xs font-black text-[#18181B] shadow-2xs active:scale-95 cursor-pointer"
                  >
                    =
                  </button>
                  {calcResult !== null && (
                    <div className="px-2.5 py-1.5 bg-[#FEF08A] border border-[#18181B] rounded-xl text-xs font-black font-mono-num text-[#18181B]">
                      {calcResult}
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
