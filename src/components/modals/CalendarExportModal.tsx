import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Download,
  Share2,
  RefreshCw,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  LogOut,
  Sliders,
} from 'lucide-react';
import type { Task } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import {
  downloadIcsCalendarFile,
  shareIcsCalendarFile,
} from '../../lib/calendarExport';
import {
  getStoredGCalToken,
  setStoredGCalToken,
  getStoredGCalUser,
  fetchGoogleUserProfile,
  initiateGoogleOAuth,
  getStoredGCalClientId,
  setStoredGCalClientId,
  isGCalAutoSyncEnabled,
  setGCalAutoSyncEnabled,
  syncAllTasksWithGoogleCalendar,
  fetchGoogleCalendarEvents,
  GoogleCalendarEvent,
  GoogleUserProfile,
} from '../../lib/googleCalendarService';
import { parseISO, subDays, addDays, format } from 'date-fns';
import confetti from 'canvas-confetti';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTasks: Task[];
  selectedDate: string;
  onImportTask?: (task: Omit<Task, 'id' | 'createdAt'>) => void;
}

type ModalTab = 'google' | 'ics';
type ExportScope = 'today' | 'week' | 'all';

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  isOpen,
  onClose,
  allTasks,
  selectedDate,
  onImportTask,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('google');
  const [authToken, setAuthToken] = useState<string>('');
  const [customClientId, setCustomClientId] = useState<string>('');
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [gcalUser, setGcalUser] = useState<GoogleUserProfile | null>(null);
  const [autoSync, setAutoSync] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

  // .ics state
  const [scope, setScope] = useState<ExportScope>('today');
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [isIcsDownloaded, setIsIcsDownloaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const token = getStoredGCalToken();
      setAuthToken(token);
      setCustomClientId(getStoredGCalClientId());
      setAutoSync(isGCalAutoSyncEnabled());
      setGcalUser(getStoredGCalUser());

      if (token) {
        fetchGoogleUserProfile(token).then((u) => {
          if (u) setGcalUser(u);
        });
        loadGoogleEvents();
      }
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const loadGoogleEvents = async () => {
    try {
      const targetDate = parseISO(selectedDate);
      const start = subDays(targetDate, 1);
      const end = addDays(targetDate, 2);
      const res = await fetchGoogleCalendarEvents(start, end);
      if (res.success) {
        setGoogleEvents(res.events);
      }
    } catch (e) {
      console.warn('Failed to load Google events', e);
    }
  };

  const handleConnectOAuth = () => {
    playClickSound();
    if (customClientId.trim()) {
      setStoredGCalClientId(customClientId.trim());
    }
    initiateGoogleOAuth(customClientId);
  };

  const handleSaveManualToken = () => {
    if (!manualTokenInput.trim()) return;
    playClickSound();
    setStoredGCalToken(manualTokenInput.trim());
    setAuthToken(manualTokenInput.trim());
    setManualTokenInput('');
    playSuccessChime();
    fetchGoogleUserProfile(manualTokenInput.trim()).then((u) => {
      if (u) setGcalUser(u);
    });
    loadGoogleEvents();
  };

  const handleDisconnect = () => {
    playClickSound();
    setStoredGCalToken('');
    setAuthToken('');
    setGcalUser(null);
    setGoogleEvents([]);
    setSyncStatusText(null);
  };

  const handleToggleAutoSync = () => {
    playClickSound();
    const next = !autoSync;
    setAutoSync(next);
    setGCalAutoSyncEnabled(next);
  };

  const handleSyncNow = async () => {
    playClickSound();
    setIsSyncing(true);
    setSyncStatusText('Connecting to Google Calendar API...');

    try {
      const res = await syncAllTasksWithGoogleCalendar(allTasks, selectedDate);
      if (res.success) {
        setGoogleEvents(res.remoteEvents);
        setSyncStatusText(`Synced! ${res.pushedCount} task(s) pushed to Google Calendar.`);
        playSuccessChime();
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#BEF264', '#FFE873', '#E8DCFF'],
        });
      } else {
        setSyncStatusText(res.error || 'Sync failed.');
      }
    } catch (err: any) {
      setSyncStatusText(err.message || 'Sync error.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportGoogleEvent = (event: GoogleCalendarEvent) => {
    if (!onImportTask) return;
    playClickSound();

    let eventDate = selectedDate;
    if (event.start?.dateTime) {
      try {
        eventDate = format(parseISO(event.start.dateTime), 'yyyy-MM-dd');
      } catch {
        eventDate = selectedDate;
      }
    } else if (event.start?.date) {
      eventDate = event.start.date;
    }

    onImportTask({
      title: event.summary,
      date: eventDate,
      category: 'general',
      estimatedMinutes: 30,
      isPriority: false,
      isCompleted: false,
    });

    playSuccessChime();
  };

  // .ics filtering
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

  const handleDownloadIcs = () => {
    playClickSound();
    const filename = `Daily-Sumire-${scope}-${selectedDate}.ics`;
    downloadIcsCalendarFile(filteredTasks, filename);
    setIsIcsDownloaded(true);
    playSuccessChime();
    setTimeout(() => setIsIcsDownloaded(false), 2500);
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
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
              <Calendar className="w-5 h-5 text-amber-950 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#18181B]">
                Calendar Sync
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Google Calendar 2-Way Sync & .ics
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('google');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'google'
                ? 'bg-white text-[#18181B] border border-[#18181B] shadow-2xs'
                : 'text-slate-500 hover:text-[#18181B]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-700" />
            <span>Google Calendar API</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('ics');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ics'
                ? 'bg-white text-[#18181B] border border-[#18181B] shadow-2xs'
                : 'text-slate-500 hover:text-[#18181B]'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span>.ics / Apple / Outlook</span>
          </button>
        </div>

        {/* TAB 1: GOOGLE CALENDAR 2-WAY SYNC */}
        {activeTab === 'google' && (
          <div className="space-y-3.5 animate-in fade-in duration-100">
            {authToken ? (
              /* CONNECTED STATE */
              <div className="space-y-3">
                {/* Account Capsule */}
                <div className="p-3.5 bg-[#D1FBE4] border-[1.75px] border-[#18181B] rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 stroke-[2.25]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#18181B]">
                          Google Calendar Active
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-950 block truncate max-w-[180px]">
                        {gcalUser?.email || 'Authenticated User'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-[#18181B] text-rose-700 cursor-pointer shadow-2xs active:scale-95"
                    title="Disconnect Google Account"
                  >
                    <LogOut className="w-3.5 h-3.5 stroke-[2.25]" />
                  </button>
                </div>

                {/* Auto Sync Toggle & Sync Now Button */}
                <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-[#18181B] block">
                        Auto Push to Google Calendar
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        Pushes tasks when scheduled
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleAutoSync}
                      className={`px-3 py-1 rounded-full text-xs font-black border-[1.5px] border-[#18181B] transition-all cursor-pointer ${
                        autoSync
                          ? 'bg-[#BEF264] text-[#18181B] shadow-2xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {autoSync ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="w-full py-2.5 rounded-xl bg-[#BEF264] hover:bg-lime-300 disabled:opacity-50 text-[#18181B] border-[1.75px] border-[#18181B] text-xs font-black shadow-2xs active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing with Google...' : '2-Way Sync Now'}</span>
                  </button>

                  {syncStatusText && (
                    <p className="text-[10px] font-bold text-center text-slate-600 bg-[#FAF7F2] p-2 rounded-xl border border-slate-200">
                      {syncStatusText}
                    </p>
                  )}
                </div>

                {/* Live Google Calendar Events */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Events from Google ({googleEvents.length})
                    </span>
                    <button
                      type="button"
                      onClick={loadGoogleEvents}
                      className="text-[9px] font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      Refresh list
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {googleEvents.length === 0 ? (
                      <div className="p-3 bg-[#FAF7F2] border border-dashed border-slate-300 rounded-xl text-center text-xs font-bold text-slate-400">
                        No events found in this date window
                      </div>
                    ) : (
                      googleEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="p-2.5 bg-white border border-[#18181B]/20 rounded-xl flex items-center justify-between gap-2 shadow-2xs text-xs"
                        >
                          <div className="truncate">
                            <p className="font-bold text-[#18181B] truncate">{evt.summary}</p>
                            <p className="text-[9px] text-slate-400 font-mono-num">
                              {evt.start?.dateTime ? format(parseISO(evt.start.dateTime), 'MMM d, HH:mm') : evt.start?.date || 'All Day'}
                            </p>
                          </div>

                          {onImportTask && (
                            <button
                              type="button"
                              onClick={() => handleImportGoogleEvent(evt)}
                              className="px-2 py-1 bg-[#FAF7F2] hover:bg-[#FFE873] border border-[#18181B] rounded-lg text-[9px] font-black text-[#18181B] flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Plus className="w-2.5 h-2.5 stroke-[3]" />
                              <span>Import</span>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* NOT CONNECTED STATE */
              <div className="space-y-3">
                <div className="p-4 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl text-center space-y-2 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-[#E8DCFF] border-[1.75px] border-[#18181B] flex items-center justify-center mx-auto shadow-2xs">
                    <RefreshCw className="w-6 h-6 text-purple-950 stroke-[2.25]" />
                  </div>
                  <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                    Connect Google Calendar
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 max-w-xs mx-auto">
                    Bidirectionally synchronize your Top 3 priorities and tasks directly with Google Calendar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConnectOAuth}
                  className="w-full py-3 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] text-[#18181B] border-[1.75px] border-[#18181B] text-xs font-black shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                  <span>Sign in with Google OAuth 2.0</span>
                </button>

                {/* Advanced Config / Manual Token entry */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-[10px] font-bold text-slate-500 hover:text-[#18181B] flex items-center gap-1 mx-auto cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{showConfig ? 'Hide API Config' : 'Manual Token / Client ID Options'}</span>
                  </button>

                  {showConfig && (
                    <div className="mt-2 p-3 bg-white border border-[#18181B] rounded-xl space-y-2 text-xs">
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">
                          Google OAuth 2.0 Client ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={customClientId}
                          onChange={(e) => setCustomClientId(e.target.value)}
                          placeholder="apps.googleusercontent.com"
                          className="w-full px-2 py-1.5 bg-[#FAF7F2] border border-[#18181B] rounded-lg text-xs font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">
                          Paste Direct Access Token
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="password"
                            value={manualTokenInput}
                            onChange={(e) => setManualTokenInput(e.target.value)}
                            placeholder="Bearer ya29..."
                            className="flex-1 px-2 py-1.5 bg-[#FAF7F2] border border-[#18181B] rounded-lg text-xs font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleSaveManualToken}
                            className="px-3 py-1.5 bg-[#BEF264] border border-[#18181B] rounded-lg text-xs font-black cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: .ICS / APPLE / OUTLOOK EXPORT */}
        {activeTab === 'ics' && (
          <div className="space-y-3.5 animate-in fade-in duration-100">
            {/* Scope Selector */}
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

            {/* Schedule Summary */}
            <div className="p-3 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700 stroke-[2.25]" />
                <span className="text-xs font-black text-[#18181B]">
                  {filteredTasks.length} Tasks selected
                </span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={includeCompleted}
                  onChange={(e) => setIncludeCompleted(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#18181B] text-[#BEF264] accent-[#18181B]"
                />
                <span>Include Done</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadIcs}
                disabled={filteredTasks.length === 0}
                className="w-full py-3 rounded-2xl bg-[#BEF264] hover:bg-lime-300 disabled:opacity-50 text-[#18181B] border-[1.75px] border-[#18181B] text-xs font-black shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                {isIcsDownloaded ? <Check className="w-4 h-4 stroke-[3]" /> : <Download className="w-4 h-4 stroke-[2.5]" />}
                <span>{isIcsDownloaded ? 'Downloaded .ics File!' : 'Download .ics Calendar File'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareIcs}
                disabled={filteredTasks.length === 0}
                className="w-full py-2.5 rounded-2xl bg-[#FAF7F2] hover:bg-slate-100 disabled:opacity-50 text-[#18181B] border-[1.5px] border-[#18181B] text-xs font-black shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5 stroke-[2.25]" />
                <span>Share .ics File (Telegram / Files)</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
