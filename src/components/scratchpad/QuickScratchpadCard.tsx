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
  Sparkles,
} from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

export const QuickScratchpadCard: React.FC = () => {
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_scratchpad_notes') || '';
    }
    return '';
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSaving(true);
      localStorage.setItem('kairo_scratchpad_notes', notes);
      const timer = setTimeout(() => setIsSaving(false), 600);
      return () => clearTimeout(timer);
    }
  }, [notes]);

  const handleCopy = () => {
    if (!notes.trim()) return;
    navigator.clipboard.writeText(notes);
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
    if (!notes.trim()) return;
    if (window.confirm('Clear all scratchpad notes?')) {
      playClickSound();
      setNotes('');
      localStorage.removeItem('kairo_scratchpad_notes');
    }
  };

  const handleInsertText = (prefix: string) => {
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
    
    // Add newline before if needed
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const insertString = needsNewline ? `\n${prefix}` : prefix;
    const newText = before + insertString + after;
    
    setNotes(newText);
    
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

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

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
          <div className="w-8 h-8 rounded-xl bg-[#FEF08A] border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs">
            <StickyNote className="w-4 h-4 text-amber-950 stroke-[2.25]" />
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
              {wordCount} words {notes.length > 0 && `• ${notes.length} chars`}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 select-none">
          {notes.trim().length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy all notes"
                className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-[#FFE873] border border-[#18181B] flex items-center justify-center text-slate-700 hover:text-[#18181B] shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleClear}
                title="Clear notes"
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

      {/* Editor & Formatting Bar */}
      {isExpanded && (
        <div className="space-y-2 animate-in fade-in duration-150">
          {/* Quick Insert Toolbar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none select-none">
            <span className="text-[9px] font-black uppercase text-slate-400 mr-0.5">Quick:</span>
            
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
              <span>Task</span>
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

          {/* Textarea Area */}
          <textarea
            ref={textareaRef}
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down instant thoughts, meeting memos, quick ideas, or code snippets..."
            className="w-full p-3 bg-[#FAF7F2] focus:bg-white text-xs font-mono font-medium rounded-xl border-[1.5px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-2xs focus:shadow-[2px_2px_0px_#18181B] transition-all resize-y leading-relaxed"
          />
        </div>
      )}
    </div>
  );
};
