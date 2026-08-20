import {
  format,
  parseISO,
  addDays,
  subDays,
  isToday,
  isYesterday,
  isTomorrow,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from 'date-fns';

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDisplayDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'EEEE, MMM d');
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}

export function getRelativeDayLabel(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  } catch {
    return dateStr;
  }
}

export function shiftDate(dateStr: string, deltaDays: number): string {
  try {
    const date = parseISO(dateStr);
    const newDate = deltaDays >= 0 ? addDays(date, deltaDays) : subDays(date, Math.abs(deltaDays));
    return format(newDate, 'yyyy-MM-dd');
  } catch {
    return getTodayString();
  }
}

export function getWeekDaysForDate(dateStr: string): {
  dateStr: string;
  dayShort: string;
  dayNumber: string;
  isToday: boolean;
  isSelected: boolean;
}[] {
  try {
    const targetDate = parseISO(dateStr);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday start

    return Array.from({ length: 7 }).map((_, index) => {
      const current = addDays(weekStart, index);
      const iso = format(current, 'yyyy-MM-dd');
      return {
        dateStr: iso,
        dayShort: format(current, 'EEE'), // Mon, Tue...
        dayNumber: format(current, 'd'),
        isToday: isToday(current),
        isSelected: iso === dateStr,
      };
    });
  } catch {
    return [];
  }
}

export interface CalendarMonthDay {
  date: Date;
  dateStr: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

export function getMonthCalendarGrid(monthDate: Date, selectedDateStr: string): CalendarMonthDay[] {
  try {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    let selectedDate: Date | null = null;
    try {
      selectedDate = parseISO(selectedDateStr);
    } catch {
      selectedDate = null;
    }

    return days.map((day) => {
      const iso = format(day, 'yyyy-MM-dd');
      return {
        date: day,
        dateStr: iso,
        dayNumber: format(day, 'd'),
        isCurrentMonth: isSameMonth(day, monthDate),
        isToday: isToday(day),
        isSelected: selectedDate ? isSameDay(day, selectedDate) : iso === selectedDateStr,
      };
    });
  } catch {
    return [];
  }
}
