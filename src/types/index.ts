export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id?: number;
  title: string;
  isPriority: boolean; // True = Top-3 task of the day
  isCompleted: boolean;
  date: string; // YYYY-MM-DD
  createdAt: number;
  category?: 'code' | 'design' | 'health' | 'learn' | 'admin' | 'general';
  estimatedMinutes?: number;
  subtasks?: SubTask[];
  isRecurring?: boolean;
  recurringDays?: string[];
  order?: number;
}

export interface Habit {
  id?: number;
  title: string;
  icon?: string;
  color?: string; // soft brutalism accent color class or hex
  targetDays: string[]; // ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  archived: boolean;
  createdAt: number;
  order?: number;
}

export interface HabitLog {
  id?: number;
  habitId: number;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface FocusSession {
  id?: number;
  taskId?: number;
  taskTitle?: string;
  durationMinutes: number;
  completedAt: number; // Timestamp
  date: string; // YYYY-MM-DD
  mode?: 'pomodoro' | 'deepwork' | 'stopwatch';
}

export interface LinkItem {
  id?: number;
  title: string;
  url: string;
  icon?: string;
  iconBg?: string;
  category?: string;
  clicks?: number;
  createdAt: number;
}

export interface HabitWithStats extends Habit {
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  completionRate: number; // 0-100%
  recentLogs: { date: string; completed: boolean }[];
}

export interface DayOverviewStats {
  totalPriority: number;
  completedPriority: number;
  totalBacklog: number;
  completedBacklog: number;
  totalHabits: number;
  completedHabits: number;
  focusMinutesToday: number;
  dailyScore: number; // 0-100%
}
