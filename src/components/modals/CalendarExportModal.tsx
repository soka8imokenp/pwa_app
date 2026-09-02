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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="bg-white border-[2px] border-[#24201D] rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <Calendar className="w-5 h-5 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display text-[#24201D]">
                Экспорт в Календарь
              </h3>
              <p className="text-[10px] text-[#6B635B] font-bold">
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
            className="w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-stone-700 hover:text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
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
                  ? 'bg-[#F0BB58] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                  : 'bg-[#FAF8F5] border-stone-200 hover:border-[#24201D]'
              }`}
            >
              <span className="text-xs font-black text-[#24201D] block">{item.label}</span>
              <span className="text-[9px] font-bold text-[#6B635B] block truncate">{item.desc}</span>
            </button>
          ))}
        </div>

        {/* Schedule Summary & Toggle */}
        <div className="p-3.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-700 stroke-[2.25]" />
            <span className="text-xs font-black text-[#24201D]">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'задача' : 'задач'} к экспорту
            </span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="accent-[#3D6B52] w-3.5 h-3.5 rounded cursor-pointer"
            />
            <span className="text-[10px] font-bold text-[#6B635B]">Включая выполненные</span>
          </label>
        </div>

        {/* Tasks Preview List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 pr-1">
          {filteredTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400 font-semibold bg-[#FAF8F5] rounded-2xl border border-dashed border-stone-200">
              Нет задач для экспорта в выбранном периоде
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className="p-2.5 bg-white border border-[#24201D]/20 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {t.isPriority ? (
                    <Target className="w-3.5 h-3.5 text-[#C25E40] shrink-0 stroke-[2.5]" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-stone-300 shrink-0" />
                  )}
                  <span
                    className={`font-bold truncate ${
                      t.isCompleted ? 'line-through text-stone-400' : 'text-[#24201D]'
                    }`}
                  >
                    {t.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono-num text-[#6B635B] font-bold">
                  {t.estimatedMinutes ? `${t.estimatedMinutes}м` : '30м'}
                  {t.isCompleted && <Check className="w-3 h-3 text-[#3D6B52] stroke-[3]" />}
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
            className="py-3 px-3 bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-50 border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black text-white shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            {isDownloaded ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200 stroke-[2.5]" />
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
            className="py-3 px-3 bg-[#FAF8F5] hover:bg-stone-100 disabled:opacity-50 border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black text-[#24201D] shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
          >
            {isShared ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#3D6B52] stroke-[2.5]" />
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
