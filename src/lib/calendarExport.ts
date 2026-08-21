import type { Task } from '../types';
import { parseISO, addMinutes, format } from 'date-fns';

/**
 * Escapes characters for iCalendar format (RFC 5545)
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Formats a Date object into UTC/Local iCalendar timestamp
 */
function formatIcsDateTime(date: Date, isAllDay: boolean = false): string {
  if (isAllDay) {
    return format(date, 'yyyyMMdd');
  }
  return format(date, "yyyyMMdd'T'HHmmss");
}

/**
 * Generates an RFC 5545 compliant .ics calendar file content
 */
export function generateIcsCalendar(
  tasks: Task[],
  options: {
    calendarName?: string;
    includeCompleted?: boolean;
  } = {}
): string {
  const { calendarName = 'Daily Sumire Planner', includeCompleted = true } = options;

  const validTasks = tasks.filter((t) => {
    if (!includeCompleted && t.isCompleted) return false;
    return Boolean(t.title && t.date);
  });

  const nowTimestamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Daily Sumire//Productivity Vault//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:UTC',
  ];

  validTasks.forEach((task, index) => {
    let startDate: Date;
    try {
      startDate = parseISO(task.date);
    } catch {
      startDate = new Date();
    }

    // If task has estimated time in minutes, calculate end time; otherwise default to 30 mins or all-day
    const durationMinutes = task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : 30;
    
    // Set a default hour if just a date (e.g. 09:00 AM + index * 45m for realistic schedule layout)
    startDate.setHours(9 + Math.floor((index * 45) / 60), (index * 45) % 60, 0, 0);
    const endDate = addMinutes(startDate, durationMinutes);

    const uid = `sumire-task-${task.id || Date.now() + index}@dailysumire.local`;
    const summaryPrefix = task.isPriority ? '[Top Priority] ' : '';
    const summary = `${summaryPrefix}${task.title}`;

    let descriptionParts: string[] = [];
    if (task.category) descriptionParts.push(`Category: ${task.category}`);
    if (task.estimatedMinutes) descriptionParts.push(`Estimated: ${task.estimatedMinutes} min`);
    if (task.subtasks && task.subtasks.length > 0) {
      descriptionParts.push('Subtasks:');
      task.subtasks.forEach((st) => {
        descriptionParts.push(`${st.isCompleted ? '[X]' : '[ ]'} ${st.title}`);
      });
    }
    descriptionParts.push('Organized with Daily Sumire');

    const description = descriptionParts.join('\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowTimestamp}`);
    lines.push(`DTSTART:${formatIcsDateTime(startDate)}`);
    lines.push(`DTEND:${formatIcsDateTime(endDate)}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push(`STATUS:${task.isCompleted ? 'COMPLETED' : 'CONFIRMED'}`);
    lines.push(`PRIORITY:${task.isPriority ? '1' : '5'}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Triggers a direct browser/native file download of the .ics file
 */
export function downloadIcsCalendarFile(tasks: Task[], filename?: string): void {
  const icsContent = generateIcsCalendar(tasks);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Daily-Sumire-${format(new Date(), 'yyyy-MM-dd')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds a direct 1-click Google Calendar Web Add link
 */
export function createGoogleCalendarLink(task: Task): string {
  let startDate: Date;
  try {
    startDate = parseISO(task.date);
  } catch {
    startDate = new Date();
  }
  startDate.setHours(10, 0, 0, 0);
  const duration = task.estimatedMinutes || 30;
  const endDate = addMinutes(startDate, duration);

  const startIso = format(startDate, "yyyyMMdd'T'HHmmss");
  const endIso = format(endDate, "yyyyMMdd'T'HHmmss");

  const title = encodeURIComponent(`${task.isPriority ? '🎯 ' : ''}${task.title}`);
  
  let detailsText = '';
  if (task.category) detailsText += `Category: ${task.category}\n`;
  if (task.subtasks && task.subtasks.length > 0) {
    detailsText += `Subtasks:\n` + task.subtasks.map((st) => `- ${st.isCompleted ? '✓' : '○'} ${st.title}`).join('\n') + '\n';
  }
  detailsText += '\nManaged with Daily Sumire Planner';

  const details = encodeURIComponent(detailsText);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
}

/**
 * Builds a direct 1-click Google Calendar Day Plan Link
 */
export function createGoogleCalendarDayPlanLink(tasks: Task[], selectedDate: string): string {
  let startDate: Date;
  try {
    startDate = parseISO(selectedDate);
  } catch {
    startDate = new Date();
  }
  startDate.setHours(9, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(18, 0, 0, 0);

  const startIso = format(startDate, "yyyyMMdd'T'HHmmss");
  const endIso = format(endDate, "yyyyMMdd'T'HHmmss");

  const title = encodeURIComponent(`Daily Sumire Schedule (${selectedDate})`);

  let detailsText = `Daily Sumire Tasks for ${selectedDate}:\n\n`;
  tasks.forEach((t) => {
    detailsText += `${t.isPriority ? '🎯 [Priority] ' : '• '}${t.title}${t.estimatedMinutes ? ` (${t.estimatedMinutes}m)` : ''}\n`;
    if (t.subtasks && t.subtasks.length > 0) {
      t.subtasks.forEach((st) => {
        detailsText += `   ${st.isCompleted ? '✓' : '○'} ${st.title}\n`;
      });
    }
  });
  detailsText += '\nManaged with Daily Sumire Planner';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${encodeURIComponent(detailsText)}`;
}

/**
 * Native Web Share API for .ics files on mobile
 */
export async function shareIcsCalendarFile(tasks: Task[], filename?: string): Promise<boolean> {
  const icsContent = generateIcsCalendar(tasks);
  const actualFilename = filename || `Daily-Sumire-${format(new Date(), 'yyyy-MM-dd')}.ics`;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    const file = new File([blob], actualFilename, { type: 'text/calendar' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Daily Sumire Schedule',
          text: 'Here is my exported schedule from Daily Sumire.',
          files: [file],
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  // Fallback to download
  downloadIcsCalendarFile(tasks, actualFilename);
  return true;
}
