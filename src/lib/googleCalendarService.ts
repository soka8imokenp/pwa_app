import type { Task } from '../types';
import { parseISO, addMinutes, format, startOfDay, endOfDay, subDays, addDays } from 'date-fns';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status?: string;
  htmlLink?: string;
}

export interface GoogleUserProfile {
  email: string;
  name?: string;
  picture?: string;
}

export const DEFAULT_GOOGLE_CLIENT_ID = '98363494043-t58b883m6upt2mrtegt90e7lq08srq01.apps.googleusercontent.com';

/**
 * Storage keys
 */
const STORAGE_GCAL_TOKEN = 'kairo_gcal_access_token';
const STORAGE_GCAL_CLIENT_ID = 'kairo_gcal_client_id';
const STORAGE_GCAL_USER = 'kairo_gcal_user_profile';
const STORAGE_GCAL_AUTO_SYNC = 'kairo_gcal_auto_sync';

export function getStoredGCalToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_GCAL_TOKEN)?.trim() || '';
  }
  return '';
}

export function setStoredGCalToken(token: string): void {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(STORAGE_GCAL_TOKEN, token.trim());
    } else {
      localStorage.removeItem(STORAGE_GCAL_TOKEN);
      localStorage.removeItem(STORAGE_GCAL_USER);
    }
  }
}

export function getStoredGCalClientId(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_GCAL_CLIENT_ID)?.trim() || '';
  }
  return '';
}

export function setStoredGCalClientId(clientId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_GCAL_CLIENT_ID, clientId.trim());
  }
}

export function isGCalAutoSyncEnabled(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_GCAL_AUTO_SYNC) === 'true';
  }
  return false;
}

export function setGCalAutoSyncEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_GCAL_AUTO_SYNC, String(enabled));
  }
}

export function getStoredGCalUser(): GoogleUserProfile | null {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_GCAL_USER);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function initiateGoogleOAuth(customClientId?: string): boolean {
  const clientId = customClientId?.trim() || getStoredGCalClientId() || DEFAULT_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return false;
  }
  let redirectUri = window.location.origin;
  if (window.location.pathname && window.location.pathname !== '/') {
    redirectUri += window.location.pathname;
  } else {
    redirectUri += '/';
  }
  const scope = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;

  window.location.href = authUrl;
  return true;
}

/**
 * Checks URL hash on page load for OAuth access_token
 */
export function handleGoogleOAuthCallback(): boolean {
  if (typeof window === 'undefined') return false;

  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return false;

  try {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
      setStoredGCalToken(accessToken);
      // Clean URL hash without reloading
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      // Fetch user profile
      fetchGoogleUserProfile(accessToken);
      return true;
    }
  } catch (err) {
    console.error('Failed to parse OAuth callback', err);
  }
  return false;
}

/**
 * Fetch connected Google account email / name
 */
export async function fetchGoogleUserProfile(token?: string): Promise<GoogleUserProfile | null> {
  const accessToken = token || getStoredGCalToken();
  if (!accessToken) return null;

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      const profile: GoogleUserProfile = {
        email: data.email,
        name: data.name,
        picture: data.picture,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_GCAL_USER, JSON.stringify(profile));
      }
      return profile;
    }
  } catch (err) {
    console.warn('Failed to fetch Google profile', err);
  }
  return null;
}

/**
 * Fetch Google Calendar events for a given date range
 */
export async function fetchGoogleCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; events: GoogleCalendarEvent[]; error?: string }> {
  const token = getStoredGCalToken();
  if (!token) {
    return { success: false, events: [], error: 'Not authenticated with Google Calendar.' };
  }

  const timeMin = startDate.toISOString();
  const timeMax = endDate.toISOString();

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      setStoredGCalToken('');
      return { success: false, events: [], error: 'Session expired. Please reconnect Google Calendar.' };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, events: [], error: errJson.error?.message || 'Failed to fetch events from Google Calendar.' };
    }

    const data = await res.json();
    const events: GoogleCalendarEvent[] = (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || 'Untitled Event',
      description: item.description || '',
      start: item.start || {},
      end: item.end || {},
      status: item.status,
      htmlLink: item.htmlLink,
    }));

    return { success: true, events };
  } catch (err: any) {
    return { success: false, events: [], error: err.message || 'Network error connecting to Google Calendar.' };
  }
}

/**
 * Create a new event in Google Calendar from a Daily Sumire task
 */
export async function pushTaskToGoogleCalendar(
  task: Task
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const token = getStoredGCalToken();
  if (!token) {
    return { success: false, error: 'Google Calendar is not connected.' };
  }

  let startDate: Date;
  try {
    startDate = parseISO(task.date);
  } catch {
    startDate = new Date();
  }
  startDate.setHours(9, 0, 0, 0);
  const duration = task.estimatedMinutes || 30;
  const endDate = addMinutes(startDate, duration);

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

  const payload = {
    summary: `${task.isPriority ? '🎯 ' : ''}${task.title}`,
    description: descriptionParts.join('\n'),
    start: {
      dateTime: startDate.toISOString(),
    },
    end: {
      dateTime: endDate.toISOString(),
    },
    colorId: task.isPriority ? '11' : '9', // Red/Blue color highlights in Google Calendar
  };

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      setStoredGCalToken('');
      return { success: false, error: 'Session expired. Please reconnect.' };
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error?.message || 'Failed to create event in Google Calendar.' };
    }

    const data = await res.json();
    return { success: true, eventId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error pushing to Google Calendar.' };
  }
}

/**
 * Bulk sync local tasks with Google Calendar
 */
export async function syncAllTasksWithGoogleCalendar(
  tasks: Task[],
  selectedDate: string
): Promise<{ success: boolean; pushedCount: number; remoteEvents: GoogleCalendarEvent[]; error?: string }> {
  const token = getStoredGCalToken();
  if (!token) {
    return { success: false, pushedCount: 0, remoteEvents: [], error: 'Not connected' };
  }

  const targetDate = parseISO(selectedDate);
  const start = startOfDay(subDays(targetDate, 2));
  const end = endOfDay(addDays(targetDate, 5));

  // 1. Fetch remote events
  const remoteResult = await fetchGoogleCalendarEvents(start, end);
  if (!remoteResult.success) {
    return { success: false, pushedCount: 0, remoteEvents: [], error: remoteResult.error };
  }

  // 2. Push unsynced local tasks for the current selected date
  const dateTasks = tasks.filter((t) => t.date === selectedDate && !t.isCompleted);
  let pushedCount = 0;

  for (const task of dateTasks) {
    // Check if event already exists by title
    const alreadyExists = remoteResult.events.some(
      (e) => e.summary.includes(task.title) || task.title.includes(e.summary)
    );
    if (!alreadyExists) {
      const pushRes = await pushTaskToGoogleCalendar(task);
      if (pushRes.success) pushedCount++;
    }
  }

  return {
    success: true,
    pushedCount,
    remoteEvents: remoteResult.events,
  };
}
