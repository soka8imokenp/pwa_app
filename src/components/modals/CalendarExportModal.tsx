import React, { useState } from 'react';
import {
  X,
  Calendar,
  Download,
  Share2,
  Check,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';
import type { Task } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import {
  downloadIcsCalendarFile,
  shareIcsCalendarFile,
} from '../../lib/calendarExport';
import { parseISO, format, subDays, addDays } from 'date-fns';

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
  const [includeCompleted, setIncludeCompleted] = useState<boolean>(true);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isShared, setIsShared] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter tasks based on scope and completion status
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
    return true;
  });

  const handleDownload = () => {
    playClickSound();
    const filename = `Daily-Sumire-${scope}-${selectedDate}.ics`;
    downloadIcsCalendarFile(filteredTasks, filename);
    setIsDownloaded(true);
    playSuccessChime();
    setTimeout(() => setIsDownloaded(false), 2500);
  };

  const handleShare = async () => {
    playClickSound();
    const filename = `Daily-Sumire-${scope}-${selectedDate}.ics`;
    const ok = await shareIcsCalendarFile(filteredTasks, filename);
    if (ok) {
      setIsShared(true);
      playSuccessChime();
      setTimeout(() => setIsShared(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#18181B]/50 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="bg-white border-[2px] border-[#18181B] rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[4px_4px_0px_#18181B] p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs">
              <Calendar className="w-5 h-5 text-amber-950 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display text-[#18181B]">
                Экспорт в Календарь
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Универсальный файл .ics для любых календарей
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-slate-700 hover:text-[#18181B] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scope Selector */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'today', label: 'Только день', desc: selectedDate },
            { id: 'week', label: 'Неделя (7д)', desc: 'Текущая неделя' },
            { id: 'all', label: 'Все задачи', desc: 'Полный план' },
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

        {/* Schedule Summary & Toggle */}
        <div className="p-3.5 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700 stroke-[2.25]" />
            <span className="text-xs font-black text-[#18181B]">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'задача' : 'задач'} к экспорту
            </span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="accent-[#18181B] w-3.5 h-3.5 rounded cursor-pointer"
            />
            <span className="text-[10px] font-bold text-slate-600">Включая выполненные</span>
          </label>
        </div>

        {/* Tasks Preview List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 pr-1">
          {filteredTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-semibold bg-[#FAF7F2] rounded-2xl border border-dashed border-slate-200">
              Нет задач для экспорта в выбранном периоде
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className="p-2.5 bg-white border border-[#18181B]/20 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {t.isPriority ? (
                    <Target className="w-3.5 h-3.5 text-rose-600 shrink-0 stroke-[2.5]" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                  )}
                  <span
                    className={`font-bold truncate ${
                      t.isCompleted ? 'line-through text-slate-400' : 'text-[#18181B]'
                    }`}
                  >
                    {t.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono-num text-slate-500 font-bold">
                  {t.estimatedMinutes ? `${t.estimatedMinutes}м` : '30м'}
                  {t.isCompleted && <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={filteredTasks.length === 0}
            className="py-3 px-3 bg-[#FFE873] hover:bg-[#FED7AA] disabled:opacity-50 border-[1.75px] border-[#18181B] rounded-2xl text-xs font-black text-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            {isDownloaded ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-800 stroke-[2.5]" />
                <span>Скачано!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.25]" />
                <span>Скачать .ics</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            disabled={filteredTasks.length === 0}
            className="py-3 px-3 bg-[#BEF264] hover:bg-lime-300 disabled:opacity-50 border-[1.75px] border-[#18181B] rounded-2xl text-xs font-black text-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            {isShared ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-800 stroke-[2.5]" />
                <span>Отправлено!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 stroke-[2.25]" />
                <span>Поделиться</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
