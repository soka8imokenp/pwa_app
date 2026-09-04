import React, { lazy, Suspense } from 'react';
import { AddTaskModal } from '../planner/AddTaskModal';
import { AddHabitModal } from '../habits/AddHabitModal';
import { MenuModal } from '../modals/MenuModal';
import { ProfileModal } from '../profile/ProfileModal';
import { AppUpdateModal } from '../modals/AppUpdateModal';
import { SecurityLockScreen } from '../security/SecurityLockScreen';
import type { Task, HabitWithStats, FocusSession, HabitLog } from '../../types';
import type { UserProfile } from '../auth/AuthContainer';
import type { AppUpdateInfo } from '../../lib/appUpdater';
import type { TabView } from './BottomNav';

// Lazy load heavy / conditional modals for faster bundle load and snappier performance
const SmartBraindumpModal = lazy(() =>
  import('../modals/SmartBraindumpModal').then((m) => ({ default: m.SmartBraindumpModal }))
);
const EveningReviewModal = lazy(() =>
  import('../modals/EveningReviewModal').then((m) => ({ default: m.EveningReviewModal }))
);
const SumireCompanionModal = lazy(() =>
  import('../modals/SumireCompanionModal').then((m) => ({ default: m.SumireCompanionModal }))
);
const SettingsModal = lazy(() =>
  import('../settings/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const CalendarPlannerModal = lazy(() =>
  import('../modals/CalendarPlannerModal').then((m) => ({ default: m.CalendarPlannerModal }))
);
const DuolingoStreakModal = lazy(() =>
  import('../modals/DuolingoStreakModal').then((m) => ({ default: m.DuolingoStreakModal }))
);
const WeeklyInfographicModal = lazy(() =>
  import('../modals/WeeklyInfographicModal').then((m) => ({ default: m.WeeklyInfographicModal }))
);
const CalendarExportModal = lazy(() =>
  import('../modals/CalendarExportModal').then((m) => ({ default: m.CalendarExportModal }))
);

export interface ModalManagerProps {
  // Task & Habit modals
  isAddTaskOpen: boolean;
  onCloseAddTask: () => void;
  addTaskPriorityDefault: boolean;
  canAddPriority: boolean;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<any>;
  selectedDate: string;

  isAddHabitOpen: boolean;
  onCloseAddHabit: () => void;
  addHabit: (habit: any) => Promise<any>;

  // Braindump
  isBraindumpOpen: boolean;
  onCloseBraindump: () => void;
  bulkAddTasks: (tasks: any[]) => Promise<any>;

  // Evening Review
  isEveningReviewOpen: boolean;
  onCloseEveningReview: () => void;
  priorityTasks: Task[];
  allTasks: Task[];
  habitsWithStats: HabitWithStats[];
  todaysSessions: FocusSession[];
  onRolloverTask: (id: number, date: string) => void | Promise<any>;
  onDemoteToBacklog: (task: Task) => void | Promise<any>;
  onToggleComplete: (task: Task) => void | Promise<any>;

  // Sumire AI Companion
  isSumireOpen: boolean;
  onCloseSumire: () => void;

  // Menu Modal
  isMenuOpen: boolean;
  onCloseMenu: () => void;
  activeTab: TabView;
  onSelectTab: (tab: TabView) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenSumire: () => void;
  onOpenEveningReview: () => void;
  onOpenWeeklyInfographic: () => void;
  onOpenCalendarExport: () => void;
  onLockApp: () => void;

  // Profile Modal
  isProfileOpen: boolean;
  onCloseProfile: () => void;
  currentUser: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onLogout: () => void;
  overallStreak?: number;
  streakCount?: number;
  allHabitLogs: HabitLog[];
  allFocusSessions: FocusSession[];
  activityStats: any;

  // Settings Modal
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  soundMutedState: boolean;
  onToggleSound: () => void;
  onShowUpdateModal: (info: AppUpdateInfo) => void;
  appMode: 'planner' | 'health';
  onChangeAppMode: (mode: 'planner' | 'health') => void;

  // App Update Modal
  availableUpdate: AppUpdateInfo | null;
  onCloseUpdateModal: () => void;

  // Calendar Planner
  isCalendarOpen: boolean;
  onCloseCalendar: () => void;
  onSelectDate: (date: string) => void;
  deleteTask: (id: number) => Promise<any>;

  // Streak Modal
  isStreakModalOpen: boolean;
  onCloseStreakModal: () => void;

  // Weekly Infographic
  isWeeklyInfographicOpen: boolean;
  onCloseWeeklyInfographic: () => void;
  displayName: string;

  // Calendar Export
  isCalendarExportOpen: boolean;
  onCloseCalendarExport: () => void;

  // Security Lock
  isLocked: boolean;
  onUnlockApp: () => void;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  isAddTaskOpen,
  onCloseAddTask,
  addTaskPriorityDefault,
  canAddPriority,
  addTask,
  selectedDate,
  isAddHabitOpen,
  onCloseAddHabit,
  addHabit,
  isBraindumpOpen,
  onCloseBraindump,
  bulkAddTasks,
  isEveningReviewOpen,
  onCloseEveningReview,
  priorityTasks,
  allTasks,
  habitsWithStats,
  todaysSessions,
  onRolloverTask,
  onDemoteToBacklog,
  onToggleComplete,
  isSumireOpen,
  onCloseSumire,
  isMenuOpen,
  onCloseMenu,
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenProfile,
  onOpenSumire,
  onOpenEveningReview,
  onOpenWeeklyInfographic,
  onOpenCalendarExport,
  onLockApp,
  isProfileOpen,
  onCloseProfile,
  currentUser,
  onUpdateProfile,
  onLogout,
  overallStreak,
  streakCount,
  allHabitLogs,
  allFocusSessions,
  activityStats,
  isSettingsOpen,
  onCloseSettings,
  soundMutedState,
  onToggleSound,
  onShowUpdateModal,
  appMode,
  onChangeAppMode,
  availableUpdate,
  onCloseUpdateModal,
  isCalendarOpen,
  onCloseCalendar,
  onSelectDate,
  deleteTask,
  isStreakModalOpen,
  onCloseStreakModal,
  isWeeklyInfographicOpen,
  onCloseWeeklyInfographic,
  displayName,
  isCalendarExportOpen,
  onCloseCalendarExport,
  isLocked,
  onUnlockApp,
}) => {
  const streak = overallStreak ?? streakCount ?? 0;

  return (
    <>
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={onCloseAddTask}
        onAddTask={addTask}
        defaultDate={selectedDate}
        defaultPriority={addTaskPriorityDefault}
        canAddPriority={canAddPriority}
      />

      <AddHabitModal
        isOpen={isAddHabitOpen}
        onClose={onCloseAddHabit}
        onAddHabit={addHabit}
      />

      <MenuModal
        isOpen={isMenuOpen}
        onClose={onCloseMenu}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onOpenSettings={onOpenSettings}
        onOpenProfile={onOpenProfile}
        onOpenSumire={onOpenSumire}
        onOpenEveningReview={onOpenEveningReview}
        onOpenWeeklyInfographic={onOpenWeeklyInfographic}
        onOpenCalendarExport={onOpenCalendarExport}
        onLockApp={onLockApp}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={onCloseProfile}
        currentUser={currentUser}
        onUpdateProfile={onUpdateProfile}
        onLogout={onLogout}
        streakCount={streak}
        allTasks={allTasks}
        habits={habitsWithStats}
        allHabitLogs={allHabitLogs}
        allFocusSessions={allFocusSessions}
        activityStats={activityStats}
        selectedDate={selectedDate}
      />

      {/* Lazy Suspense Loaded Modals */}
      <Suspense fallback={null}>
        {isBraindumpOpen && (
          <SmartBraindumpModal
            isOpen={isBraindumpOpen}
            onClose={onCloseBraindump}
            onBulkAddTasks={bulkAddTasks}
            selectedDate={selectedDate}
            canAddPriority={canAddPriority}
          />
        )}

        {isEveningReviewOpen && (
          <EveningReviewModal
            isOpen={isEveningReviewOpen}
            onClose={onCloseEveningReview}
            priorityTasks={priorityTasks}
            allTasks={allTasks}
            habits={habitsWithStats}
            todaysSessions={todaysSessions}
            selectedDate={selectedDate}
            onRolloverTask={onRolloverTask}
            onDemoteToBacklog={onDemoteToBacklog}
            onToggleComplete={onToggleComplete}
          />
        )}

        {isSumireOpen && (
          <SumireCompanionModal
            isOpen={isSumireOpen}
            onClose={onCloseSumire}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={onCloseSettings}
            darkMode={false}
            onToggleDarkMode={() => {}}
            isSoundMuted={soundMutedState}
            onToggleSound={onToggleSound}
            onDataChanged={() => {}}
            onShowUpdateModal={onShowUpdateModal}
            onLockApp={onLockApp}
            appMode={appMode}
            onChangeAppMode={onChangeAppMode}
          />
        )}

        {isCalendarOpen && (
          <CalendarPlannerModal
            isOpen={isCalendarOpen}
            onClose={onCloseCalendar}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            allTasks={allTasks}
            onAddTask={addTask}
            onToggleTask={onToggleComplete}
            onDeleteTask={deleteTask}
            onOpenExport={onOpenCalendarExport}
          />
        )}

        {isStreakModalOpen && (
          <DuolingoStreakModal
            isOpen={isStreakModalOpen}
            onClose={onCloseStreakModal}
            streakCount={streak}
            activityStats={activityStats}
          />
        )}

        {isWeeklyInfographicOpen && (
          <WeeklyInfographicModal
            isOpen={isWeeklyInfographicOpen}
            onClose={onCloseWeeklyInfographic}
            tasks={allTasks}
            habitLogs={allHabitLogs}
            focusSessions={allFocusSessions}
            userName={displayName}
          />
        )}

        {isCalendarExportOpen && (
          <CalendarExportModal
            isOpen={isCalendarExportOpen}
            onClose={onCloseCalendarExport}
            allTasks={allTasks}
            selectedDate={selectedDate}
          />
        )}
      </Suspense>

      {availableUpdate && (
        <AppUpdateModal
          isOpen={Boolean(availableUpdate)}
          onClose={onCloseUpdateModal}
          updateInfo={availableUpdate}
        />
      )}

      {isLocked && (
        <SecurityLockScreen
          onUnlock={onUnlockApp}
          userName={displayName}
        />
      )}
    </>
  );
};
