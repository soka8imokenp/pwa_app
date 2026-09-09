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
import {
  formatDateDirect,
  formatMonthYearDirect,
  getRelativeDayDirect,
  getStoredLanguage,
} from '../i18n/LanguageContext';
import { translations } from '../i18n/translations';

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDisplayDate(dateStr: string): string {
  return formatDateDirect(dateStr);
}

export function formatMonthYear(date: Date): string {
  return formatMonthYearDirect(date);
}

export function getRelativeDayLabel(dateStr: string): string {
  return getRelativeDayDirect(dateStr);
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
    const lang = getStoredLanguage();
    const dict = translations[lang] || translations.uz;

    return Array.from({ length: 7 }).map((_, index) => {
      const current = addDays(weekStart, index);
      const iso = format(current, 'yyyy-MM-dd');
      const weekdayIndex = index; // 0 to 6 Monday to Sunday

      return {
        dateStr: iso,
        dayShort: dict.date.weekdaysShort[weekdayIndex] || format(current, 'EEE'),
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
