import React, { useState, useEffect, useRef } from 'react';
import {
  StickyNote,
  Copy,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ListPlus,
  CheckSquare,
  Clock,
  PlusCircle,
  Mic,
  MicOff,
  Sparkles,
} from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { startVoiceDictation, stopVoiceDictation, isSpeechRecognitionSupported } from '../../lib/speechRecognition';
import confetti from 'canvas-confetti';
import type { Task } from '../../types';

interface ScratchTab {
  id: string;
  title: string;
  color: string;
  accentColor: string;
  icon: string;
}

const TABS: ScratchTab[] = [
  { id: 'ideas', title: 'Ideas', color: '#FEF08A', accentColor: '#CA8A04', icon: '💡' },
  { id: 'tasks', title: 'Tasks', color: '#E8DCFF', accentColor: '#7E22CE', icon: '⚡' },
  { id: 'work', title: 'Work', color: '#D1FBE4', accentColor: '#059669', icon: '💻' },
  { id: 'memo', title: 'Memo', color: '#FED7AA', accentColor: '#EA580C', icon: '📌' },
];

interface QuickScratchpadCardProps {
  selectedDate?: string;
  onQuickCreateTask?: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<any>;
}

export const QuickScratchpadCard: React.FC<QuickScratchpadCardProps> = ({
  selectedDate,
  onQuickCreateTask,
}) => {
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_scratchpad_active_tab') || 'ideas';
    }
    return 'ideas';
  });

  const [notesByTab, setNotesByTab] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kairo_scratchpad_multinotes');
        if (saved) return JSON.parse(saved);
        // Fallback for previous single note
        const oldNote = localStorage.getItem('kairo_scratchpad_notes');
        if (oldNote) return { ideas: oldNote, tasks: '', work: '', memo: '' };
      } catch {}
    }
    return { ideas: '', tasks: '', work: '', memo: '' };
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [createdTaskNotice, setCreatedTaskNotice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentNotes = notesByTab[activeTabId] || '';
  const currentTab = TABS.find((t) => t.id === activeTabId) || TABS[0];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSaving(true);
      localStorage.setItem('kairo_scratchpad_multinotes', JSON.stringify(notesByTab));
      localStorage.setItem('kairo_scratchpad_active_tab', activeTabId);
      const timer = setTimeout(() => setIsSaving(false), 500);
      return () => clearTimeout(timer);
    }
  }, [notesByTab, activeTabId]);

  const handleNotesChange = (text: string) => {
    setNotesByTab((prev) => ({
      ...prev,
      [activeTabId]: text,
    }));
  };

  const handleCopy = () => {
    if (!currentNotes.trim()) return;
    navigator.clipboard.writeText(currentNotes);
    setCopied(true);
    playSuccessChime();
    confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (!currentNotes.trim()) return;
    if (window.confirm(`Clear all notes in "${currentTab.title}" tab?`)) {
      playClickSound();
      handleNotesChange('');
    }
  };

  const handleInsertText = (prefix: string) => {
    playClickSound();
    const textarea = textareaRef.current;
    if (!textarea) {
      handleNotesChange(currentNotes ? `${currentNotes}\n${prefix}` : prefix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = currentNotes.substring(0, start);
    const after = currentNotes.substring(end);
    
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const insertString = needsNewline ? `\n${prefix}` : prefix;
    const newText = before + insertString + after;
    
    handleNotesChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newPos = start + insertString.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const insertTimestamp = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    handleInsertText(`[${timeStr}] `);
  };

  const handleToggleVoice = () => {
    playClickSound();
    if (isVoiceRecording) {
      stopVoiceDictation();
      setIsVoiceRecording(false);
    } else {
      if (!isSpeechRecognitionSupported()) {
        alert('Voice dictation is not supported in this browser.');
        return;
      }
      setIsVoiceRecording(true);
      startVoiceDictation({
        onTranscript: (transcript: string) => {
          handleInsertText(transcript);
        },
        onEnd: () => {
          setIsVoiceRecording(false);
        },
        onError: () => {
          setIsVoiceRecording(false);
        },
      });
    }
  };

  const handleConvertToTask = async () => {
    if (!currentNotes.trim() || !onQuickCreateTask) return;
    playClickSound();

    // Grab first non-empty line or first 60 chars
    const lines = currentNotes.trim().split('\n').filter((l) => l.trim().length > 0);
    const taskTitle = lines[0].replace(/^[•\-\*\[\]xX\s]+/, '').trim() || currentNotes.slice(0, 50);

    await onQuickCreateTask({
      title: taskTitle,
      date: selectedDate || new Date().toISOString().slice(0, 10),
      isPriority: false,
      isCompleted: false,
      category: activeTabId === 'work' ? 'code' : 'general',
      estimatedMinutes: 25,
    });

    playSuccessChime();
    setCreatedTaskNotice(true);
    setTimeout(() => setCreatedTaskNotice(false), 2500);
  };

  const wordCount = currentNotes.trim() ? currentNotes.trim().split(/\s+/).length : 0;

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3 font-body">
      
      {/* Top Header Bar */}
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
            style={{ backgroundColor: currentTab.color }}
          >
            <StickyNote className="w-4 h-4 stroke-[2.25]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                Quick Scratchpad
              </h3>
              {/* Auto-Save Status Indicator */}
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500">
                <span className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                {isSaving ? 'Saving...' : 'Saved'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold font-mono-num">
              {wordCount} words {currentNotes.length > 0 && `• ${currentNotes.length} chars`}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 select-none">
          {createdTaskNotice && (
            <span className="text-[9px] font-extrabold text-emerald-700 bg-[#D1FBE4] border border-[#18181B] px-2 py-0.5 rounded-lg shadow-2xs animate-in fade-in">
              Task Added!
            </span>
          )}

          {currentNotes.trim().length > 0 && (
            <>
              {onQuickCreateTask && (
                <button
                  type="button"
                  onClick={handleConvertToTask}
                  title="Convert top line into a planner task"
                  className="px-2 py-1 bg-[#FAF7F2] hover:bg-[#FFE873] border border-[#18181B] rounded-lg text-[10px] font-black text-[#18181B] flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3 text-purple-800" />
                  <span className="hidden sm:inline">To Task</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                title="Copy note"
                className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-[#FFE873] border border-[#18181B] flex items-center justify-center text-slate-700 hover:text-[#18181B] shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleClear}
                title="Clear tab notes"
                className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-rose-50 border border-[#18181B]/40 hover:border-rose-500 flex items-center justify-center text-slate-400 hover:text-rose-600 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
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

      {/* Editor Body */}
      {isExpanded && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          
          {/* Tab Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 scrollbar-none select-none">
            {TABS.map((tab) => {
              const isActive = activeTabId === tab.id;
              const hasContent = (notesByTab[tab.id] || '').trim().length > 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setActiveTabId(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl border-[1.5px] text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'border-[#18181B] text-[#18181B] shadow-2xs ring-1 ring-[#18181B]'
                      : 'bg-[#FAF7F2] border-[#18181B]/20 text-slate-500 hover:border-[#18181B] hover:bg-white'
                  }`}
                  style={{ backgroundColor: isActive ? tab.color : undefined }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.title}</span>
                  {hasContent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#18181B]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Insert Toolbar */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto py-0.5 px-0.5 scrollbar-none select-none">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleInsertText('• ')}
                className="px-2 py-1 bg-[#FAF7F2] hover:bg-white border border-[#18181B]/20 hover:border-[#18181B] rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <ListPlus className="w-3 h-3 text-purple-700" />
                <span>Bullet</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertText('[ ] ')}
                className="px-2 py-1 bg-[#FAF7F2] hover:bg-white border border-[#18181B]/20 hover:border-[#18181B] rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <CheckSquare className="w-3 h-3 text-emerald-700" />
                <span>Checklist</span>
              </button>

              <button
                type="button"
                onClick={insertTimestamp}
                className="px-2 py-1 bg-[#FAF7F2] hover:bg-white border border-[#18181B]/20 hover:border-[#18181B] rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Clock className="w-3 h-3 text-amber-700" />
                <span>Time</span>
              </button>
            </div>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isVoiceRecording ? 'Stop voice recording' : 'Dictate note'}
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0 ${
                isVoiceRecording
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-[#FAF7F2] hover:bg-white border-[#18181B]/20 text-slate-700'
              }`}
            >
              {isVoiceRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-rose-600" />}
              <span>{isVoiceRecording ? 'Listening...' : 'Voice'}</span>
            </button>
          </div>

          {/* Textarea Area with Dynamic Tint Matching Tab */}
          <textarea
            ref={textareaRef}
            rows={5}
            value={currentNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder={`Jot down quick ${currentTab.title.toLowerCase()}... (Auto-saved locally)`}
            className="w-full p-3 bg-[#FAF7F2] focus:bg-white text-xs font-mono font-medium rounded-xl border-[1.5px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-2xs focus:shadow-[2px_2px_0px_#18181B] transition-all resize-y leading-relaxed"
          />
        </div>
      )}
    </div>
  );
};
