import React, { useState, useEffect } from 'react';
import { StickyNote, Copy, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

export const QuickScratchpadCard: React.FC = () => {
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_scratchpad_notes') || '';
    }
    return '';
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_scratchpad_notes', notes);
    }
  }, [notes]);

  const handleCopy = () => {
    if (!notes.trim()) return;
    navigator.clipboard.writeText(notes);
    setCopied(true);
    playSuccessChime();
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (!notes.trim()) return;
    playClickSound();
    setNotes('');
    localStorage.removeItem('kairo_scratchpad_notes');
  };

  const handleTextChange = (text: string) => {
    setNotes(text);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 1500);
  };

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <div className="neo-card p-4 bg-white space-y-3 font-body select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => {
            playClickSound();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-[#FEF08A] border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B]">
            <StickyNote className="w-4 h-4 text-amber-950 stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#18181B]">
              Quick Scratchpad
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">
              {wordCount} words {notes.length > 0 && `• ${notes.length} chars`}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5">
          {isSavedRecently && (
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mr-1 animate-in fade-in">
              <Check className="w-3 h-3 stroke-[2.5]" />
              Saved
            </span>
          )}

          {notes.trim().length > 0 && (
            <>
              <button
                onClick={handleCopy}
                title="Copy Scratchpad"
                className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-slate-100 border border-slate-200 hover:border-[#18181B] flex items-center justify-center text-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleClear}
                title="Clear Notes"
                className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-rose-50 border border-slate-200 hover:border-rose-400 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => {
              playClickSound();
              setIsExpanded(!isExpanded);
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
            className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-[#18181B] cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <textarea
        rows={isExpanded ? 7 : 3}
        value={notes}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Quickly jot down instant thoughts, meeting memos, code snippets, or ideas..."
        className="w-full p-3 bg-[#FAF7F2] text-xs font-mono font-medium rounded-xl border-[1.5px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-[1px_1px_0px_#18181B] focus:bg-white transition-all resize-none"
      />
    </div>
  );
};
