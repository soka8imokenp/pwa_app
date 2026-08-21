import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { DateNavigator } from './components/layout/DateNavigator';
import { BottomNav, TabView } from './components/layout/BottomNav';
import { BackgroundDecorations } from './components/layout/BackgroundDecorations';
import { PrioritiesPage } from './components/pages/PrioritiesPage';
import { BacklogPage } from './components/pages/BacklogPage';
import { HabitsPage } from './components/pages/HabitsPage';
import { FocusPage } from './components/pages/FocusPage';
import { StatsPage } from './components/pages/StatsPage';
import { LinksPage } from './components/pages/LinksPage';
import { AddTaskModal } from './components/planner/AddTaskModal';
import { AddHabitModal } from './components/habits/AddHabitModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { SmartBraindumpModal } from './components/modals/SmartBraindumpModal';
import { EveningReviewModal } from './components/modals/EveningReviewModal';
import { SumireCompanionModal } from './components/modals/SumireCompanionModal';
import { MenuModal } from './components/modals/MenuModal';
import { AppUpdateModal } from './components/modals/AppUpdateModal';
import { CalendarPlannerModal } from './components/modals/CalendarPlannerModal';
import { CalendarExportModal } from './components/modals/CalendarExportModal';
import { DuolingoStreakModal } from './components/modals/DuolingoStreakModal';
import { WeeklyInfographicModal } from './components/modals/WeeklyInfographicModal';
import { AuthContainer, UserProfile } from './components/auth/AuthContainer';
import { AppSplashScreen } from './components/common/AppSplashScreen';
import { initNotificationSystem } from './lib/notifications';
import { checkForAppUpdate, AppUpdateInfo } from './lib/appUpdater';
import { usePlannerData } from './hooks/usePlannerData';
import { getTodayString } from './lib/dateUtils';
import { isSoundMuted, setSoundMuted, playClickSound, playSuccessChime } from './lib/sound';
import { handleGoogleOAuthCallback } from './lib/googleCalendarService';
import type { Task } from './types';

export function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_auth_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [activeTab, setActiveTab] = useState<TabView>('priorities');
  const [soundMutedState, setSoundMutedState] = useState(isSoundMuted());
  const [showSplash, setShowSplash] = useState(true);

  // Modals state
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskPriorityDefault, setAddTaskPriorityDefault] = useState(false);
  const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBraindumpOpen, setIsBraindumpOpen] = useState(false);
  const [isEveningReviewOpen, setIsEveningReviewOpen] = useState(false);
  const [isSumireOpen, setIsSumireOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isWeeklyInfographicOpen, setIsWeeklyInfographicOpen] = useState(false);
  const [isCalendarExportOpen, setIsCalendarExportOpen] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdateInfo | null>(null);

  // Focus Timer active selection
  const [focusSelectedTask, setFocusSelectedTask] = useState<Task | null>(null);

  // Initialize notification deep-linking system & check for Telegram APK updates & daily streak greeting
  useEffect(() => {
    initNotificationSystem((targetTab, extra) => {
      if (targetTab) {
        setActiveTab(targetTab);
        if (extra?.taskId) {
          // If task id is provided, optionally highlight or select
        }
      }
    });

    const handleWebNavigate = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };

    window.addEventListener('sumire:navigate', handleWebNavigate);

    // Auto-check for updates from GitHub Releases
    checkForAppUpdate().then((update) => {
      if (update && update.hasUpdate) {
        setAvailableUpdate(update);
      }
    });

    // Check if returning from Google OAuth 2.0 flow
    if (handleGoogleOAuthCallback()) {
      setIsCalendarExportOpen(true);
      playSuccessChime();
    }

    // Check if streak greeting was shown today; if not, greet user with Duolingo streak screen!
    if (typeof window !== 'undefined') {
      const todayStr = getTodayString();
      const lastGreetingDate = localStorage.getItem('kairo_last_streak_greeting_date');
      if (lastGreetingDate !== todayStr) {
        const timer = setTimeout(() => {
          setIsStreakModalOpen(true);
          localStorage.setItem('kairo_last_streak_greeting_date', todayStr);
        }, 800);
        return () => clearTimeout(timer);
      }

      // Auto-prompt evening review if enabled, scheduled hour is reached, and not done yet today
      const debriefEnabled = localStorage.getItem('kairo_evening_debrief_enabled') !== 'false';
      const debriefTime = localStorage.getItem('kairo_evening_debrief_time') || '21:00';
      const debriefHour = parseInt(debriefTime.split(':')[0] || '21', 10);
      const currentHour = new Date().getHours();
      const debriefDone = localStorage.getItem(`kairo_evening_debrief_done_${todayStr}`);
      const debriefPrompted = localStorage.getItem(`kairo_evening_debrief_prompted_${todayStr}`);

      if (debriefEnabled && currentHour >= debriefHour && !debriefDone && !debriefPrompted) {
        const debriefTimer = setTimeout(() => {
          setIsEveningReviewOpen(true);
          localStorage.setItem(`kairo_evening_debrief_prompted_${todayStr}`, 'true');
        }, 1400);
        return () => clearTimeout(debriefTimer);
      }
    }

    return () => window.removeEventListener('sumire:navigate', handleWebNavigate);
  }, []);

  // Planner Data Hook (IndexedDB / Dexie.js)
  const {
    allTasks,
    allHabitLogs,
    allFocusSessions,
    allLinks,
    priorityTasks,
    backlogTasks,
    habitsWithStats,
    todaysFocusSessions,
    overallStreak,
    activityStats,
    dayStats,
    canAddPriority,
    addTask,
    bulkAddTasks,
    toggleTaskComplete,
    toggleSubTaskComplete,
    promoteTaskToPriority,
    demoteTaskToBacklog,
    deleteTask,
    updateTaskDate,
    addHabit,
    deleteHabit,
    toggleHabitLog,
    logFocusSession,
    deleteFocusSession,
    addLink,
    deleteLink,
    incrementLinkClicks,
  } = usePlannerData(selectedDate);

  const handleStartFocus = (task: Task) => {
    setFocusSelectedTask(task);
    setActiveTab('focus');
    playClickSound();
  };

  const handleOpenAddTask = (prioritySlotIndex?: number) => {
    if (prioritySlotIndex !== undefined) {
      setAddTaskPriorityDefault(true);
    } else {
      setAddTaskPriorityDefault(false);
    }
    setIsAddTaskOpen(true);
  };

  const handleToggleSound = () => {
    const next = !soundMutedState;
    setSoundMutedState(next);
    setSoundMuted(next);
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
  };

  const handleLogout = () => {
    localStorage.removeItem('kairo_auth_user');
    setCurrentUser(null);
  };

  // If not authenticated, render Login / Register / Forgot Password screen
  if (!currentUser) {
    return (
      <>
        {showSplash && <AppSplashScreen onFinish={() => setShowSplash(false)} />}
        <AuthContainer onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  const displayName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.username || 'Sam Smith';

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#18181B] flex justify-center bg-subtle-grid relative overflow-x-hidden">
      {showSplash && <AppSplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Dynamic Background Elements */}
      <BackgroundDecorations />

      {/* Mobile Screen Frame */}
      <div className="w-full max-w-md min-h-screen flex flex-col relative px-3 sm:px-0 z-10">
        
        {/* Mobile Top Header with User Greeting & Streak Modal Trigger */}
        <Header
          streakCount={overallStreak}
          userName={displayName}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenStreak={() => setIsStreakModalOpen(true)}
        />

        {/* Date Navigator Strip for Daily Views */}
        {(activeTab === 'priorities' || activeTab === 'habits') && (
          <div className="pt-2">
            <DateNavigator
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              stats={dayStats}
              onOpenCalendar={() => setIsCalendarOpen(true)}
            />
          </div>
        )}

        {/* Page Body View with safe bottom padding for dock */}
        <main className="flex-1 w-full pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+120px)]">
          {activeTab === 'priorities' && (
            <PrioritiesPage
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              priorityTasks={priorityTasks}
              allTasks={allTasks}
              focusSessions={allFocusSessions}
              onToggleComplete={toggleTaskComplete}
              onToggleSubTaskComplete={toggleSubTaskComplete}
              onDemoteToBacklog={demoteTaskToBacklog}
              onDeleteTask={deleteTask}
              onOpenAddTask={handleOpenAddTask}
              onStartFocus={handleStartFocus}
              onLogFocusSession={logFocusSession}
              onQuickCreateTask={addTask}
            />
          )}

          {activeTab === 'backlog' && (
            <BacklogPage
              backlogTasks={backlogTasks}
              canPromoteToPriority={canAddPriority}
              onToggleComplete={toggleTaskComplete}
              onPromoteToPriority={promoteTaskToPriority}
              onDeleteTask={deleteTask}
              onQuickAddTask={(title, category, minutes) =>
                addTask({
                  title,
                  category: (category as any) || 'general',
                  estimatedMinutes: minutes || 30,
                  isPriority: false,
                  isCompleted: false,
                  date: selectedDate,
                })
              }
            />
          )}

          {activeTab === 'habits' && (
            <HabitsPage
              habits={habitsWithStats}
              selectedDate={selectedDate}
              onToggleHabitLog={toggleHabitLog}
              onDeleteHabit={deleteHabit}
              onOpenAddHabit={() => setIsAddHabitOpen(true)}
              onQuickAddHabit={(title, icon, color) =>
                addHabit({ title, icon, color, targetDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] })
              }
            />
          )}

          {activeTab === 'links' && (
            <LinksPage
              links={allLinks}
              onAddLink={addLink}
              onDeleteLink={deleteLink}
              onIncrementClicks={incrementLinkClicks}
            />
          )}

          {activeTab === 'focus' && (
            <FocusPage
              activeTasks={priorityTasks.concat(backlogTasks)}
              selectedTask={focusSelectedTask}
              onClearSelectedTask={() => setFocusSelectedTask(null)}
              onLogFocusSession={logFocusSession}
              onDeleteFocusSession={deleteFocusSession}
              todaysSessions={todaysFocusSessions}
              selectedDate={selectedDate}
            />
          )}

          {activeTab === 'stats' && (
            <StatsPage
              tasks={allTasks}
              habitLogs={allHabitLogs}
              focusSessions={allFocusSessions}
              onSelectDate={setSelectedDate}
              onOpenInfographic={() => setIsWeeklyInfographicOpen(true)}
            />
          )}
        </main>

        {/* Persistent Symmetrical Bottom Nav Dock */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenSumire={() => setIsSumireOpen(true)}
          onOpenMenu={() => setIsMenuOpen(true)}
        />

        {/* Modals & Panels */}
        <AddTaskModal
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
          onAddTask={addTask}
          defaultDate={selectedDate}
          defaultPriority={addTaskPriorityDefault}
          canAddPriority={canAddPriority}
        />

        <AddHabitModal
          isOpen={isAddHabitOpen}
          onClose={() => setIsAddHabitOpen(false)}
          onAddHabit={addHabit}
        />

        <SmartBraindumpModal
          isOpen={isBraindumpOpen}
          onClose={() => setIsBraindumpOpen(false)}
          onBulkAddTasks={bulkAddTasks}
          selectedDate={selectedDate}
          canAddPriority={canAddPriority}
        />

        <EveningReviewModal
          isOpen={isEveningReviewOpen}
          onClose={() => setIsEveningReviewOpen(false)}
          priorityTasks={priorityTasks}
          allTasks={allTasks}
          habits={habitsWithStats}
          todaysSessions={todaysFocusSessions}
          selectedDate={selectedDate}
          onRolloverTask={updateTaskDate}
          onDemoteToBacklog={demoteTaskToBacklog}
          onToggleComplete={toggleTaskComplete}
        />

        <SumireCompanionModal
          isOpen={isSumireOpen}
          onClose={() => setIsSumireOpen(false)}
        />

        <MenuModal
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenEveningReview={() => setIsEveningReviewOpen(true)}
          onOpenWeeklyInfographic={() => setIsWeeklyInfographicOpen(true)}
          onOpenCalendarExport={() => setIsCalendarExportOpen(true)}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          darkMode={false}
          onToggleDarkMode={() => {}}
          isSoundMuted={soundMutedState}
          onToggleSound={handleToggleSound}
          onDataChanged={() => {}}
          currentUser={currentUser}
          onLogout={handleLogout}
          onShowUpdateModal={(info) => setAvailableUpdate(info)}
        />

        {/* Telegram Auto-Update Modal */}
        {availableUpdate && (
          <AppUpdateModal
            isOpen={Boolean(availableUpdate)}
            onClose={() => setAvailableUpdate(null)}
            updateInfo={availableUpdate}
          />
        )}

        {/* Calendar & Multi-Event Day Planner Modal */}
        <CalendarPlannerModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setActiveTab('priorities');
          }}
          allTasks={allTasks}
          onAddTask={addTask}
          onToggleTask={toggleTaskComplete}
          onDeleteTask={deleteTask}
          onOpenExport={() => setIsCalendarExportOpen(true)}
        />

        {/* Duolingo-style Streak Greeting Modal */}
        <DuolingoStreakModal
          isOpen={isStreakModalOpen}
          onClose={() => setIsStreakModalOpen(false)}
          streakCount={overallStreak}
          activityStats={activityStats}
        />

        {/* Weekly Infographic Export Modal */}
        <WeeklyInfographicModal
          isOpen={isWeeklyInfographicOpen}
          onClose={() => setIsWeeklyInfographicOpen(false)}
          tasks={allTasks}
          habitLogs={allHabitLogs}
          focusSessions={allFocusSessions}
          userName={displayName}
        />

        {/* Calendar Sync & .ics Export Modal */}
        <CalendarExportModal
          isOpen={isCalendarExportOpen}
          onClose={() => setIsCalendarExportOpen(false)}
          allTasks={allTasks}
          selectedDate={selectedDate}
          onImportTask={addTask}
        />
      </div>
    </div>
  );
}

export default App;
