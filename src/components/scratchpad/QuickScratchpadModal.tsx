import React, { useState, useEffect } from 'react';
import { StickyNote, Copy, Trash2, Check, X, Sparkles, FileText } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface QuickScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickScratchpadModal: React.FC<QuickScratchpadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_scratchpad_notes') || '';
    }
    return '';
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_scratchpad_notes', notes);
    }
  }, [notes]);

  if (!isOpen) return null;

  const handleCopy = () => {
    playSuccessChime();
    navigator.clipboard.writeText(notes);
    setCopied(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#BEF264', '#C084FC', '#FED7AA'],
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Clear all scratchpad notes?')) {
      playClickSound();
      setNotes('');
    }
  };

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-3.5 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#18181B]/15 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#FEF08A] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs">
              <StickyNote className="w-5 h-5 text-amber-950 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#18181B]">
                Quick Scratchpad
              </h3>
              <p className="text-[10px] font-semibold text-slate-500">
                Instant thoughts, code snippets & notes
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-slate-600 hover:text-[#18181B] cursor-pointer shadow-2xs active:scale-95"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Textarea */}
        <div className="flex-1 min-h-[16rem]">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down quick ideas, meeting memos, bugs to look at later, or code snippets..."
            className="w-full h-full p-4 bg-[#FAF7F2] text-xs font-bold rounded-2xl border-[1.75px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-2xs resize-none font-mono"
            autoFocus
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 shrink-0">
          <span className="text-[10px] font-black text-slate-400 font-mono-num uppercase">
            {wordCount} words • {notes.length} chars
          </span>

          <div className="flex items-center gap-2">
            {notes && (
              <button
                onClick={handleClear}
                className="p-2 rounded-full bg-[#FAF7F2] hover:bg-rose-50 border border-slate-300 text-slate-400 hover:text-rose-600 cursor-pointer shadow-2xs"
                title="Clear Notes"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleCopy}
              disabled={!notes.trim()}
              className="px-4 py-2 rounded-full bg-[#C084FC] hover:bg-[#B366FA] disabled:opacity-40 text-[#18181B] border-[1.5px] border-[#18181B] text-xs font-black shadow-xs active:translate-y-0.5 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 stroke-[2.25]" />
                  <span>Copy Notes</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
