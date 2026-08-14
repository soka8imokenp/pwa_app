import { format, parseISO, addDays, subDays, isToday, isYesterday, isTomorrow, startOfWeek } from 'date-fns';

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

export function getWeekDaysForDate(dateStr: string): { dateStr: string; dayShort: string; dayNumber: string; isToday: boolean; isSelected: boolean }[] {
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
