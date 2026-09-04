import React, { useState } from 'react';
import { Trash2, Calendar } from 'lucide-react';
import { playClickSound } from '../../../lib/sound';
import type { WeightLog } from '../../../types/health';

interface WeightHistoryListProps {
  weightLogs: WeightLog[];
  onDeleteLog: (id: number) => Promise<void>;
}

export const WeightHistoryList: React.FC<WeightHistoryListProps> = ({
  weightLogs,
  onDeleteLog,
}) => {
  const [displayLimit, setDisplayLimit] = useState(7);

  // Newest first
  const sortedLogs = [...weightLogs].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );

  const visibleLogs = sortedLogs.slice(0, displayLimit);

  const handleDelete = async (id: number) => {
    playClickSound();
    if (confirm('Delete this weigh-in entry?')) {
      await onDeleteLog(id);
    }
  };

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
      <div className="flex items-center justify-between border-b border-[#24201D]/15 pb-2">
        <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
          Weigh-In Log History
        </h3>
        <span className="text-[10px] font-bold text-stone-400 font-mono-num">
          {weightLogs.length} entries
        </span>
      </div>

      {visibleLogs.length === 0 ? (
        <p className="text-xs text-[#6B635B] font-bold text-center py-4">
          No records found.
        </p>
      ) : (
        <div className="space-y-2">
          {visibleLogs.map((log) => (
            <div
              key={log.id || log.createdAt}
              className="p-3 bg-[#FAF8F5] border border-[#24201D]/15 rounded-xl flex items-center justify-between hover:bg-stone-50 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black font-mono-num text-[#24201D]">
                    {log.weight} kg
                  </span>
                  <span className="text-[10px] font-bold text-[#6B635B] flex items-center gap-1 font-mono-num">
                    <Calendar className="w-3 h-3" />
                    {log.date}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#6B635B]">
                  {log.bodyFatPercentage && (
                    <span>Fat: <b>{log.bodyFatPercentage}%</b></span>
                  )}
                  {log.waistCm && (
                    <span>Waist: <b>{log.waistCm}cm</b></span>
                  )}
                  {log.note && (
                    <span className="italic text-stone-500">&ldquo;{log.note}&rdquo;</span>
                  )}
                </div>
              </div>

              {log.id && (
                <button
                  type="button"
                  onClick={() => handleDelete(log.id!)}
                  title="Delete weigh-in"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {sortedLogs.length > displayLimit && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setDisplayLimit((prev) => prev + 10);
              }}
              className="w-full py-2 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-xs font-bold text-[#6B635B] cursor-pointer"
            >
              Show More ({sortedLogs.length - displayLimit} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
