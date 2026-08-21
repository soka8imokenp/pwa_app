import React, { useState } from 'react';
import {
  X,
  Calendar,
  Download,
  ExternalLink,
  Share2,
  Check,
  CheckCircle2,
  Clock,
  Target,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { Task } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import {
  downloadIcsCalendarFile,
  shareIcsCalendarFile,
  createGoogleCalendarLink,
} from '../../lib/calendarExport';
import { parseISO, subDays, addDays, isSameDay } from 'date-fns';
import confetti from 'canvas-confetti';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTasks: Task[];
  selectedDate: string;
}

type ExportScope = 'today' | 'week' | 'all';

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  isOpen,
  onClose,
  allTasks,
  selectedDate,
}) => {
  const [scope, setScope] = useState<ExportScope>('today');
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [isExported, setIsExported] = useState(false);

  if (!isOpen) return null;

  // Filter tasks based on selected scope
  const targetDate = parseISO(selectedDate);
  const weekStart = subDays(targetDate, 3);
  const weekEnd = addDays(targetDate, 3);

  const filteredTasks = allTasks.filter((t) => {
    if (!t.title) return false;
    if (!includeCompleted && t.isCompleted) return false;

    if (scope === 'today') {
      return t.date === selectedDate;
    } else if (scope === 'week') {
      try {
        const taskDate = parseISO(t.date);
        return taskDate >= weekStart && taskDate <= weekEnd;
      } catch {
        return false;
      }
    }
    return true; // 'all'
  });

  const totalEstimatedMins = filteredTasks.reduce(
    (acc, t) => acc + (t.estimatedMinutes || 30),
    0
  );
  const totalHours = (totalEstimatedMins / 60).toFixed(1);

  const handleDownloadIcs = () => {
    playClickSound();
    const filename = `Daily-Sumire-${scope}-${selectedDate}.ics`;
    downloadIcsCalendarFile(filteredTasks, filename);
    
    playSuccessChime();
    setIsExported(true);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#BEF264', '#E8DCFF'],
    });

    setTimeout(() => {
      setIsExported(false);
    }, 2500);
  };

  const handleShareIcs = async () => {
    playClickSound();
    const filename = `Daily-Sumire-${scope}-${selectedDate}.ics`;
    await shareIcsCalendarFile(filteredTasks, filename);
    playSuccessChime();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#18181B]/50 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8DCFF] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
              <Calendar className="w-5 h-5 text-purple-950 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#18181B]">
                Calendar Sync & .ics
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Export to Google, Apple & Outlook
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-slate-700 hover:text-[#18181B] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* 1. Scope Selector */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
            Choose Export Range
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'today', label: 'Today Only', desc: selectedDate },
              { id: 'week', label: '7-Day Plan', desc: 'Current Week' },
              { id: 'all', label: 'All Tasks', desc: 'Full Schedule' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  setScope(item.id as ExportScope);
                }}
                className={`p-2.5 rounded-2xl border-[1.5px] text-left transition-all cursor-pointer ${
                  scope === item.id
                    ? 'bg-[#FFE873] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-[#FAF7F2] border-slate-200 hover:border-[#18181B]'
                }`}
              >
                <span className="text-xs font-black text-[#18181B] block">{item.label}</span>
                <span className="text-[9px] font-bold text-slate-500 block truncate">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Tasks Summary Card */}
        <div className="p-3.5 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs">
              <Clock className="w-4 h-4 text-slate-700 stroke-[2.25]" />
            </div>
            <div>
              <span className="text-xs font-black text-[#18181B] block">
                {filteredTasks.length} Task{filteredTasks.length === 1 ? '' : 's'} Selected
              </span>
              <span className="text-[10px] font-bold text-slate-500 block">
                ~{totalHours}h estimated calendar time
              </span>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-[#D1FBE4] border border-[#18181B] rounded-full text-[9px] font-black text-emerald-950 uppercase shadow-2xs">
            RFC 5545
          </span>
        </div>

        {/* 3. Task Preview with 1-Click Google Calendar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase text-slate-500">
              Schedule Preview
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600">
              <input
                type="checkbox"
                checked={includeCompleted}
                onChange={(e) => setIncludeCompleted(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#18181B] text-[#BEF264] accent-[#18181B]"
              />
              <span>Include Completed</span>
            </label>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {filteredTasks.length === 0 ? (
              <div className="p-4 bg-[#FAF7F2] border border-dashed border-[#18181B]/30 rounded-2xl text-center text-xs font-bold text-slate-400">
                No tasks found for this range
              </div>
            ) : (
              filteredTasks.map((t) => {
                const gCalUrl = createGoogleCalendarLink(t);
                return (
                  <div
                    key={t.id || t.title}
                    className="p-2.5 bg-white border border-[#18181B]/20 rounded-xl flex items-center justify-between gap-2 shadow-2xs text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {t.isPriority ? (
                        <Target className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                      )}
                      <span className={`font-bold truncate ${t.isCompleted ? 'line-through text-slate-400' : 'text-[#18181B]'}`}>
                        {t.title}
                      </span>
                    </div>

                    <a
                      href={gCalUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => playClickSound()}
                      title="Add directly to Google Calendar"
                      className="px-2 py-1 bg-[#FAF7F2] hover:bg-[#E8DCFF] border border-[#18181B] rounded-lg text-[9px] font-black text-[#18181B] flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 transition-all"
                    >
                      <span>Google</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadIcs}
            disabled={filteredTasks.length === 0}
            className="w-full py-3 rounded-2xl bg-[#BEF264] hover:bg-lime-300 disabled:opacity-50 text-[#18181B] border-[1.75px] border-[#18181B] text-xs font-black shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            {isExported ? <Check className="w-4 h-4 stroke-[3]" /> : <Download className="w-4 h-4 stroke-[2.5]" />}
            <span>{isExported ? 'Downloaded .ics File!' : 'Download .ics Calendar File'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareIcs}
            disabled={filteredTasks.length === 0}
            className="w-full py-2.5 rounded-2xl bg-[#FAF7F2] hover:bg-slate-100 disabled:opacity-50 text-[#18181B] border-[1.5px] border-[#18181B] text-xs font-black shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2.25]" />
            <span>Share .ics File (Mobile / Telegram)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
