import React, { useState } from 'react';
import {
  X,
  History,
  Check,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Sparkles,
  Play,
  Scale,
  Search,
  RotateCcw,
  Clock,
  Layers,
  Calendar,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ActivityLog } from '../../lib/db';
import { clearActivityLogs } from '../../lib/activityLogger';
import { playClickSound } from '../../lib/sound';

interface ActivityLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterCategory = 'all' | 'task' | 'habit' | 'scale' | 'focus';

export const ActivityLogsModal: React.FC<ActivityLogsModalProps> = ({ isOpen, onClose }) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const logs = useLiveQuery(
    () => db.activityLogs.orderBy('timestamp').reverse().toArray(),
    []
  ) || [];

  if (!isOpen) return null;

  const handleClose = () => {
    playClickSound();
    setIsConfirmingClear(false);
    onClose();
  };

  const handleClear = async () => {
    playClickSound();
    await clearActivityLogs();
    setIsConfirmingClear(false);
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'task' && log.entity !== 'task' && log.entity !== 'priority' && log.entity !== 'backlog') {
        return false;
      }
      if (selectedFilter === 'habit' && log.entity !== 'habit') {
        return false;
      }
      if (selectedFilter === 'scale' && log.entity !== 'scale') {
        return false;
      }
      if (selectedFilter === 'focus' && log.entity !== 'focus') {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = log.title.toLowerCase().includes(q);
      const matchesDetails = (log.details || '').toLowerCase().includes(q);
      const matchesAction = log.action.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDetails && !matchesAction) {
        return false;
      }
    }

    return true;
  });

  const getActionConfig = (action: ActivityLog['action'], entity: ActivityLog['entity']) => {
    switch (action) {
      case 'completed':
        return {
          icon: <Check className="w-3.5 h-3.5 stroke-[3] text-[#2D503C]" />,
          bg: '#DDE8DE',
          text: '#2D503C',
          label: 'Completed',
        };
      case 'uncompleted':
        return {
          icon: <RotateCcw className="w-3.5 h-3.5 stroke-[2.5] text-[#78716C]" />,
          bg: '#F4F0EA',
          text: '#78716C',
          label: 'Reopened',
        };
      case 'created':
        return {
          icon: <Plus className="w-3.5 h-3.5 stroke-[3] text-[#24546B]" />,
          bg: '#DEE8EF',
          text: '#24546B',
          label: 'Created',
        };
      case 'promoted':
        return {
          icon: <ArrowUp className="w-3.5 h-3.5 stroke-[3] text-[#854D0E]" />,
          bg: '#FBECCF',
          text: '#854D0E',
          label: 'Promoted',
        };
      case 'demoted':
        return {
          icon: <ArrowDown className="w-3.5 h-3.5 stroke-[3] text-[#6B635B]" />,
          bg: '#FAF8F5',
          text: '#6B635B',
          label: 'Backlog',
        };
      case 'deleted':
        return {
          icon: <Trash2 className="w-3.5 h-3.5 stroke-[2.5] text-[#991B1B]" />,
          bg: '#FEE2E2',
          text: '#991B1B',
          label: 'Deleted',
        };
      case 'focus':
        return {
          icon: <Play className="w-3.5 h-3.5 fill-[#854D0E] text-[#854D0E]" />,
          bg: '#FBECCF',
          text: '#854D0E',
          label: 'Focus Done',
        };
      case 'weight':
        return {
          icon: <Scale className="w-3.5 h-3.5 text-[#0369A1] stroke-[2.5]" />,
          bg: '#E0F2FE',
          text: '#0369A1',
          label: 'Scale Synced',
        };
      case 'habit':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-[#6B21A8] stroke-[2.5]" />,
          bg: '#F3E8FF',
          text: '#6B21A8',
          label: 'Habit Done',
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-[#6B635B]" />,
          bg: '#FAF8F5',
          text: '#6B635B',
          label: action,
        };
    }
  };

  const formatLogTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${mins}`;

    if (isToday) {
      return `Today, ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[d.getMonth()]} ${d.getDate()}, ${timeStr}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#24201D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg h-[84vh] max-h-[660px] min-h-[500px] bg-[#FAF8F5] border-[2px] border-[#24201D] rounded-3xl shadow-[6px_6px_0px_#24201D] flex flex-col overflow-hidden">
        
        {/* 1. Header Bar */}
        <div className="p-4 bg-white border-b-[1.75px] border-[#24201D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-[1px_1px_0px_#24201D]">
              <History className="w-5 h-5 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Activity Log
              </h3>
              <p className="text-[10px] text-[#8C827A] font-medium leading-tight">
                Recent activity & history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prominent Clear Button */}
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsConfirmingClear(true);
                }}
                title="Clear all logs"
                className="px-2.5 py-1.5 rounded-xl bg-[#FEE2E2] hover:bg-[#FECACA] border-[1.75px] border-[#24201D] text-[#991B1B] flex items-center gap-1.5 shadow-[2px_2px_0px_#24201D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer font-display"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Clear
                </span>
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-xl bg-white hover:bg-[#F4F0EA] border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-[1px_1px_0px_#24201D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* "Are You Sure?" Confirmation Popup Dialog in signature aesthetic */}
        {isConfirmingClear && (
          <div className="absolute inset-0 z-40 bg-[#24201D]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-[310px] bg-[#FAF8F5] border-[2.5px] border-[#24201D] rounded-3xl shadow-[5px_5px_0px_#24201D] p-5 text-center space-y-3.5 animate-in zoom-in-95 duration-150 select-none">
              <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] border-[2px] border-[#24201D] shadow-[2px_2px_0px_#24201D] flex items-center justify-center mx-auto text-[#991B1B]">
                <Trash2 className="w-6 h-6 stroke-[2.25]" />
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-black font-display uppercase tracking-wide text-[#24201D]">
                  Clear Activity Log?
                </h4>
                <p className="text-[11px] text-[#6B635B] font-medium leading-snug">
                  Are you sure you want to delete all activity history? This cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsConfirmingClear(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border-[1.75px] border-[#24201D] bg-white text-[#24201D] font-bold text-xs hover:bg-[#F4F0EA] shadow-[2px_2px_0px_#24201D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 py-2.5 rounded-xl border-[1.75px] border-[#24201D] bg-[#DC2626] hover:bg-[#B91C1C] text-white font-black text-xs shadow-[2px_2px_0px_#24201D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Yes, Clear</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Controls & Search Bar */}
        <div className="p-3 bg-[#F4F0EA] border-b border-[#24201D]/15 space-y-2 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8C827A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions, tasks or metrics..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border-[1.5px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-[#8C827A] placeholder:font-normal focus:outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#24201D] cursor-pointer"
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'task', label: 'Tasks' },
              { id: 'habit', label: 'Habits' },
              { id: 'scale', label: 'Scale' },
              { id: 'focus', label: 'Focus' },
            ].map((tab) => {
              const isActive = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedFilter(tab.id as FilterCategory);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#24201D] text-white shadow-2xs'
                      : 'bg-white text-[#6B635B] hover:bg-[#FAF8F5] border border-[#24201D]/20 shadow-2xs'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Feed List (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center py-10 px-4 text-center space-y-2 bg-white/60 border-[1.75px] border-dashed border-[#24201D]/25 rounded-2xl">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center justify-center mx-auto text-[#8C827A]">
                <History className="w-5 h-5 stroke-[1.75]" />
              </div>
              <p className="text-xs font-bold text-[#24201D]">
                {searchQuery ? 'No matching logs found' : 'No activity logged yet'}
              </p>
              <p className="text-[10px] text-[#8C827A] max-w-xs mx-auto">
                Actions like completing tasks, logging weights from smart scale, or finishing focus sessions will appear here.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const cfg = getActionConfig(log.action, log.entity);

              return (
                <div
                  key={log.id || `${log.timestamp}-${log.title}`}
                  className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex items-start gap-3 transition-all hover:translate-x-0.5"
                >
                  {/* Action Icon Badge */}
                  <div
                    className="w-7 h-7 rounded-xl border border-[#24201D]/30 flex items-center justify-center shrink-0 shadow-2xs mt-0.5"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    {cfg.icon}
                  </div>

                  {/* Log Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Action Badge */}
                        <span
                          className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border border-[#24201D]/20"
                          style={{ backgroundColor: cfg.bg, color: cfg.text }}
                        >
                          {cfg.label}
                        </span>

                        {/* Entity Pill */}
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#8C827A] bg-[#FAF8F5] px-1.5 py-0.5 rounded-md border border-[#24201D]/15">
                          {log.entity}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] font-bold font-mono-num text-[#8C827A] whitespace-nowrap shrink-0">
                        {formatLogTime(log.timestamp)}
                      </span>
                    </div>

                    {/* Main Title */}
                    <h4 className="text-xs font-bold text-[#24201D] leading-snug break-words">
                      {log.title}
                    </h4>

                    {/* Additional details */}
                    {log.details && (
                      <p className="text-[10px] text-[#6B635B] font-medium leading-tight mt-0.5">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
