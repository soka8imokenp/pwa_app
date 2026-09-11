import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { DateNavigator } from './components/layout/DateNavigator';
import { BottomNav, TabView, HealthTab } from './components/layout/BottomNav';
import { BackgroundDecorations } from './components/layout/BackgroundDecorations';
import { HealthBodyPage } from './components/health/HealthBodyPage';
import { HealthIntakePage } from './components/health/HealthIntakePage';
import { HealthActivityPage } from './components/health/HealthActivityPage';
import { HealthCoachPage } from './components/health/HealthCoachPage';
import { useHealthData } from './hooks/useHealthData';
import { PrioritiesPage } from './components/pages/PrioritiesPage';
import { BacklogPage } from './components/pages/BacklogPage';
import { HabitsPage } from './components/pages/HabitsPage';
import { FocusPage } from './components/pages/FocusPage';
import { StatsPage } from './components/pages/StatsPage';
import { LinksPage } from './components/pages/LinksPage';
import { ModalManager } from './components/layout/ModalManager';
import { OfflineBanner } from './components/common/OfflineBanner';
import { ToastContainer } from './components/common/ToastContainer';
import { AuthContainer, UserProfile } from './components/auth/AuthContainer';
import { OAuthReturnScreen } from './components/auth/OAuthReturnScreen';
import { processGoogleToken } from './lib/googleAuth';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { AppSplashScreen } from './components/common/AppSplashScreen';
import { initNotificationSystem } from './lib/notifications';
import { checkForAppUpdate, AppUpdateInfo } from './lib/appUpdater';
import { usePlannerData } from './hooks/usePlannerData';
import { getTodayString } from './lib/dateUtils';
import { isSoundMuted, setSoundMuted, playClickSound, playSuccessChime } from './lib/sound';
import { isAppLocked, setAppLocked } from './lib/securityService';
import type { Task } from './types';
import { Bot, X } from 'lucide-react';
import { initAssistantService, type AssistantToast } from './lib/assistantService';

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

  // Check if current browser window is returning from Google OAuth redirect (#access_token=... or #id_token=...)
  const [oauthReturnData, setOauthReturnData] = useState<{ hash: string; search: string } | null>(() => {
    if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        hash.includes('access_token=') ||
        hash.includes('id_token=') ||
        search.includes('access_token=') ||
        search.includes('id_token=')
      ) {
        return { hash, search };
      }
    }
    return null;
  });

  // Global App deep link listener for OAuth return in native APK
  useEffect(() => {
    const handleDeepLinkToken = async (urlString: string) => {
      try {
        console.log('[App] Received deep link:', urlString);
        let paramPart = '';
        const hashIdx = urlString.indexOf('#');
        const queryIdx = urlString.indexOf('?');
        if (hashIdx !== -1) {
          paramPart = urlString.substring(hashIdx + 1);
        } else if (queryIdx !== -1) {
          paramPart = urlString.substring(queryIdx + 1);
        }

        if (paramPart) {
          const params = new URLSearchParams(paramPart);
          const idToken = params.get('id_token');
          const accessToken = params.get('access_token');
          const token = idToken || accessToken;
          if (token) {
            const user = await processGoogleToken(token);
            setCurrentUser(user);
            if (Capacitor.isNativePlatform()) {
              Browser.close().catch(() => {});
            }
          }
        }
      } catch (e) {
        console.error('Failed to handle deep link token in App:', e);
      }
    };

    (window as any).__onAuthDeepLink = handleDeepLinkToken;

    if (Capacitor.isNativePlatform()) {
      CapApp.getLaunchUrl().then((res) => {
        if (res?.url) handleDeepLinkToken(res.url);
      }).catch(() => {});

      const subPromise = CapApp.addListener('appUrlOpen', (data) => {
        if (data?.url) handleDeepLinkToken(data.url);
      });

      return () => {
        subPromise.then((s) => s.remove()).catch(() => {});
      };
    }
  }, []);

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [activeTab, setActiveTab] = useState<TabView>('priorities');
  const [appMode, setAppMode] = useState<'planner' | 'health'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('kairo_app_mode') as 'planner' | 'health') || 'planner';
    }
    return 'planner';
  });
  const [activeHealthTab, setActiveHealthTab] = useState<HealthTab>('body');

  const [autoOpenHealthWizard, setAutoOpenHealthWizard] = useState<boolean>(false);

  const handleSetAppMode = (mode: 'planner' | 'health') => {
    setAppMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_app_mode', mode);
      if (mode === 'health') {
        const onboarded = localStorage.getItem('kairo_health_onboarded');
        const isUncalibrated = !onboarded || !healthProfile?.currentWeight || healthProfile.currentWeight <= 0;
        if (isUncalibrated) {
          setAutoOpenHealthWizard(true);
        }
      }
    }
  };

  const {
    profile: healthProfile,
    metrics: healthMetrics,
    allWeightLogs,
    todaysMeals,
    todaysWaterLogs,
    todaysWorkouts,
    todaysTotalKcal,
    todaysProteinGrams,
    todaysCarbsGrams,
    todaysFatGrams,
    todaysWaterTotalMl,
    todaysActiveCaloriesBurned,
    updateProfile: updateHealthProfile,
    logWeight,
    deleteWeightLog,
    logMeal,
    deleteMealLog,
    logWater,
    removeLatestWater,
    logWorkout,
    deleteWorkout,
  } = useHealthData(selectedDate);

  const [soundMutedState, setSoundMutedState] = useState(isSoundMuted());
  const [showSplash, setShowSplash] = useState(true);

  // Modals state
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskPriorityDefault, setAddTaskPriorityDefault] = useState(false);
  const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBraindumpOpen, setIsBraindumpOpen] = useState(false);
  const [isEveningReviewOpen, setIsEveningReviewOpen] = useState(false);
  const [isSumireOpen, setIsSumireOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isWeeklyInfographicOpen, setIsWeeklyInfographicOpen] = useState(false);
  const [isCalendarExportOpen, setIsCalendarExportOpen] = useState(false);
  const [isActivityLogsOpen, setIsActivityLogsOpen] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdateInfo | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(() => isAppLocked());

  const handleLockApp = () => {
    setAppLocked(true);
    setIsLocked(true);
  };

  const handleUnlockApp = () => {
    setAppLocked(false);
    setIsLocked(false);
  };

  // Focus Timer active selection
  const [focusSelectedTask, setFocusSelectedTask] = useState<Task | null>(null);

  // Google Assistant / Gemini voice feedback toast
  const [assistantToast, setAssistantToast] = useState<AssistantToast | null>(null);

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
        if (e.detail.tab === 'backlog') {
          setTimeout(() => {
            const el = document.getElementById('backlog-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      }
    };

    window.addEventListener('sumire:navigate', handleWebNavigate);

    // Auto-check for updates from GitHub Releases (skip during OAuth return handoff)
    if (!oauthReturnData) {
      checkForAppUpdate().then((update) => {
        if (update && update.hasUpdate) {
          setAvailableUpdate(update);
        }
      });
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

    // Initialize Google Assistant / Gemini voice command listener
    const cleanupAssistant = initAssistantService(
      (targetTab) => {
        setActiveTab(targetTab);
      },
      (toast) => {
        setAssistantToast(toast);
        setTimeout(() => {
          setAssistantToast((curr) => (curr?.id === toast.id ? null : curr));
        }, 4000);
      }
    );

    return () => {
      window.removeEventListener('sumire:navigate', handleWebNavigate);
      cleanupAssistant();
    };
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
    reorderPriorityTasks,
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

  // If returning from Google OAuth in mobile browser, show dedicated Return Screen to hand off to native app
  if (oauthReturnData) {
    return (
      <OAuthReturnScreen
        hash={oauthReturnData.hash}
        search={oauthReturnData.search}
        onContinueInWeb={async () => {
          try {
            const raw = oauthReturnData.hash || oauthReturnData.search;
            const clean = raw.startsWith('#') || raw.startsWith('?') ? raw.substring(1) : raw;
            const params = new URLSearchParams(clean);
            const token = params.get('id_token') || params.get('access_token');
            if (token) {
              const user = await processGoogleToken(token);
              setCurrentUser(user);
            }
          } catch (e) {
            console.error('Failed to process web login:', e);
          } finally {
            window.history.replaceState(null, '', window.location.pathname);
            setOauthReturnData(null);
          }
        }}
      />
    );
  }

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
    <div className="min-h-screen bg-[#F4F0EA] text-[#24201D] flex justify-center relative overflow-x-hidden">
      {showSplash && <AppSplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Dynamic Background Elements */}
      <BackgroundDecorations />

      {/* Mobile Screen Frame */}
      <div className="w-full max-w-md min-h-screen flex flex-col relative px-3 sm:px-0 z-10">
        <OfflineBanner />
        <ToastContainer />

        {/* Google Assistant / Gemini Voice Feedback Banner */}
        {assistantToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] w-[92%] max-w-sm bg-[#FAF8F5] border-[2px] border-[#24201D] rounded-2xl shadow-[4px_4px_0px_#24201D] p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200 select-none font-body">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#3D6B52] text-white border border-[#24201D] shadow-2xs flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 stroke-[2.25]" />
              </div>
              <div className="min-w-0 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3D6B52] block font-display leading-tight">
                  {assistantToast.title}
                </span>
                <span className="text-xs font-bold text-[#24201D] truncate block">
                  {assistantToast.subtitle}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAssistantToast(null)}
              className="w-6 h-6 rounded-lg hover:bg-stone-200 text-[#6B635B] flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}
        
        {/* Mobile Top Header with User Greeting & Streak Modal Trigger */}
        <Header
          streakCount={overallStreak}
          userName={displayName}
          appMode={appMode}
          onChangeAppMode={handleSetAppMode}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenStreak={() => setIsStreakModalOpen(true)}
        />

        {/* Date Navigator Strip for Daily Views */}
        {((appMode === 'planner' && (activeTab === 'priorities' || activeTab === 'habits')) ||
          (appMode === 'health' && (activeHealthTab === 'intake' || activeHealthTab === 'activity'))) && (
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
        <main className="flex-1 w-full pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+74px)]">
          {appMode === 'health' ? (
            <>
              {activeHealthTab === 'body' && (
                <HealthBodyPage
                  profile={healthProfile}
                  metrics={healthMetrics}
                  weightLogs={allWeightLogs}
                  selectedDate={selectedDate}
                  onSaveWeight={logWeight}
                  onDeleteWeightLog={deleteWeightLog}
                  onUpdateProfile={updateHealthProfile}
                  autoOpenWizard={autoOpenHealthWizard}
                  onWizardHandled={() => setAutoOpenHealthWizard(false)}
                />
              )}

              {activeHealthTab === 'intake' && (
                <HealthIntakePage
                  metrics={healthMetrics}
                  todaysMeals={todaysMeals}
                  todaysWaterLogs={todaysWaterLogs}
                  todaysTotalKcal={todaysTotalKcal}
                  todaysProteinGrams={todaysProteinGrams}
                  todaysCarbsGrams={todaysCarbsGrams}
                  todaysFatGrams={todaysFatGrams}
                  todaysWaterTotalMl={todaysWaterTotalMl}
                  todaysActiveCaloriesBurned={todaysActiveCaloriesBurned}
                  selectedDate={selectedDate}
                  onLogMeal={logMeal}
                  onDeleteMealLog={deleteMealLog}
                  onLogWater={logWater}
                  onRemoveLatestWater={removeLatestWater}
                />
              )}

              {activeHealthTab === 'activity' && (
                <HealthActivityPage
                  profile={healthProfile}
                  metrics={healthMetrics}
                  todaysWorkouts={todaysWorkouts}
                  todaysActiveCaloriesBurned={todaysActiveCaloriesBurned}
                  selectedDate={selectedDate}
                  onLogWorkout={logWorkout}
                  onDeleteWorkout={deleteWorkout}
                  onSelectDate={setSelectedDate}
                />
              )}

              {activeHealthTab === 'coach' && (
                <HealthCoachPage
                  profile={healthProfile}
                  metrics={healthMetrics}
                  weightLogs={allWeightLogs}
                  todaysMeals={todaysMeals}
                  todaysWaterTotalMl={todaysWaterTotalMl}
                  todaysWorkouts={todaysWorkouts}
                  todaysActiveCaloriesBurned={todaysActiveCaloriesBurned}
                  todaysTotalKcal={todaysTotalKcal}
                  todaysProteinGrams={todaysProteinGrams}
                  todaysCarbsGrams={todaysCarbsGrams}
                  todaysFatGrams={todaysFatGrams}
                />
              )}
            </>
          ) : (
            <>
              {(activeTab === 'priorities' || activeTab === 'backlog') && (
                <PrioritiesPage
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  priorityTasks={priorityTasks}
                  backlogTasks={backlogTasks}
                  canAddPriority={canAddPriority}
                  allTasks={allTasks}
                  focusSessions={allFocusSessions}
                  onToggleComplete={toggleTaskComplete}
                  onToggleSubTaskComplete={toggleSubTaskComplete}
                  onDemoteToBacklog={demoteTaskToBacklog}
                  onPromoteToPriority={promoteTaskToPriority}
                  onDeleteTask={deleteTask}
                  onOpenAddTask={handleOpenAddTask}
                  onStartFocus={handleStartFocus}
                  onReorderPriority={reorderPriorityTasks}
                  onLogFocusSession={logFocusSession}
                  onQuickCreateTask={addTask}
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
            </>
          )}
        </main>

        {/* Persistent Symmetrical 4-Item Bottom Nav Dock */}
        <BottomNav
          appMode={appMode}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          activeHealthTab={activeHealthTab}
          onChangeHealthTab={setActiveHealthTab}
          onOpenMenu={() => setIsMenuOpen(true)}
        />

        {/* Modals & Overlays managed via ModalManager */}
        <ModalManager
          isAddTaskOpen={isAddTaskOpen}
          onCloseAddTask={() => setIsAddTaskOpen(false)}
          addTaskPriorityDefault={addTaskPriorityDefault}
          canAddPriority={canAddPriority}
          addTask={addTask}
          selectedDate={selectedDate}
          isAddHabitOpen={isAddHabitOpen}
          onCloseAddHabit={() => setIsAddHabitOpen(false)}
          addHabit={addHabit}
          isBraindumpOpen={isBraindumpOpen}
          onCloseBraindump={() => setIsBraindumpOpen(false)}
          bulkAddTasks={bulkAddTasks}
          isEveningReviewOpen={isEveningReviewOpen}
          onCloseEveningReview={() => setIsEveningReviewOpen(false)}
          priorityTasks={priorityTasks}
          allTasks={allTasks}
          habitsWithStats={habitsWithStats}
          todaysSessions={todaysFocusSessions}
          onRolloverTask={updateTaskDate}
          onDemoteToBacklog={demoteTaskToBacklog}
          onToggleComplete={toggleTaskComplete}
          isSumireOpen={isSumireOpen}
          onCloseSumire={() => setIsSumireOpen(false)}
          isMenuOpen={isMenuOpen}
          onCloseMenu={() => setIsMenuOpen(false)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenSumire={() => setIsSumireOpen(true)}
          onOpenEveningReview={() => setIsEveningReviewOpen(true)}
          onOpenWeeklyInfographic={() => setIsWeeklyInfographicOpen(true)}
          onOpenCalendarExport={() => setIsCalendarExportOpen(true)}
          onOpenActivityLogs={() => setIsActivityLogsOpen(true)}
          onLockApp={handleLockApp}
          isProfileOpen={isProfileOpen}
          onCloseProfile={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onUpdateProfile={(updated) => setCurrentUser(updated)}
          onLogout={handleLogout}
          overallStreak={overallStreak}
          streakCount={overallStreak}
          allHabitLogs={allHabitLogs}
          allFocusSessions={allFocusSessions}
          activityStats={activityStats}
          isSettingsOpen={isSettingsOpen}
          onCloseSettings={() => setIsSettingsOpen(false)}
          soundMutedState={soundMutedState}
          onToggleSound={handleToggleSound}
          onShowUpdateModal={(info) => setAvailableUpdate(info)}
          appMode={appMode}
          onChangeAppMode={handleSetAppMode}
          availableUpdate={availableUpdate}
          onCloseUpdateModal={() => setAvailableUpdate(null)}
          isCalendarOpen={isCalendarOpen}
          onCloseCalendar={() => setIsCalendarOpen(false)}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setActiveTab('priorities');
          }}
          deleteTask={deleteTask}
          isStreakModalOpen={isStreakModalOpen}
          onCloseStreakModal={() => setIsStreakModalOpen(false)}
          isWeeklyInfographicOpen={isWeeklyInfographicOpen}
          onCloseWeeklyInfographic={() => setIsWeeklyInfographicOpen(false)}
          displayName={displayName}
          isCalendarExportOpen={isCalendarExportOpen}
          onCloseCalendarExport={() => setIsCalendarExportOpen(false)}
          isLocked={isLocked}
          onUnlockApp={handleUnlockApp}
          isActivityLogsOpen={isActivityLogsOpen}
          onCloseActivityLogs={() => setIsActivityLogsOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
