import { db } from './db';
import { getTodayString } from './dateUtils';
import { playSuccessChime, playClickSound } from './sound';
import type { TabView } from '../components/layout/BottomNav';

export interface AssistantToast {
  id: string;
  title: string;
  subtitle: string;
  type: 'task' | 'note' | 'focus' | 'feature';
}

type ToastCallback = (toast: AssistantToast) => void;
type NavigateCallback = (tab: TabView, extra?: any) => void;

let onToastCallback: ToastCallback | null = null;
let onNavigateCallback: NavigateCallback | null = null;

export function registerAssistantCallbacks(
  onNavigate: NavigateCallback,
  onToast: ToastCallback
) {
  onNavigateCallback = onNavigate;
  onToastCallback = onToast;
}

/**
 * Parses raw URI or query parameters from Google Assistant / Gemini
 * Supported schemes:
 *  - sumire://assistant?action=create_task&title=...&priority=true
 *  - sumire://task/create?title=...
 *  - sumire://assistant?action=create_note&text=...
 *  - sumire://note/create?text=...
 *  - sumire://assistant?action=start_focus&duration=25
 *  - sumire://focus/start?minutes=25
 *  - sumire://assistant?action=open_feature&feature=habits
 */
export async function handleAssistantUri(rawUri: string): Promise<boolean> {
  if (!rawUri || typeof rawUri !== 'string') return false;

  try {
    const trimmed = rawUri.trim();
    // Normalize custom schemes to a parsable URL
    const urlString = trimmed
      .replace(/^sumire:\/\//i, 'https://sumire.app/')
      .replace(/^kairo:\/\//i, 'https://sumire.app/');

    const url = new URL(urlString);
    const searchParams = url.searchParams;
    const path = url.pathname.toLowerCase();

    // 1. Determine Action
    let action = searchParams.get('action')?.toLowerCase() || '';

    if (!action) {
      if (path.includes('/task') || path.includes('task')) action = 'create_task';
      else if (path.includes('/note') || path.includes('note')) action = 'create_note';
      else if (path.includes('/focus') || path.includes('focus')) action = 'start_focus';
      else if (path.includes('/feature') || path.includes('feature')) action = 'open_feature';
    }

    const today = getTodayString();

    // 2. Execute Action
    if (action === 'create_task') {
      let taskTitle =
        searchParams.get('title') ||
        searchParams.get('name') ||
        searchParams.get('task') ||
        searchParams.get('text') ||
        '';

      taskTitle = decodeURIComponent(taskTitle).trim();
      if (!taskTitle) {
        taskTitle = 'Новая задача (Google)';
      }

      const isPriorityParam = searchParams.get('priority');
      const isPriority = isPriorityParam !== null ? isPriorityParam === 'true' : true;

      // Add to database
      const id = await db.tasks.add({
        title: taskTitle,
        date: today,
        isPriority,
        isCompleted: false,
        createdAt: Date.now(),
        order: 0,
      });

      // Log in activity feed
      await db.activityLogs.add({
        timestamp: Date.now(),
        date: today,
        action: 'created',
        entity: isPriority ? 'priority' : 'task',
        title: taskTitle,
        details: 'Google Assistant / Gemini',
      });

      playSuccessChime();

      if (onToastCallback) {
        onToastCallback({
          id: String(id || Date.now()),
          title: 'Google / Gemini: Задача создана',
          subtitle: taskTitle,
          type: 'task',
        });
      }

      if (onNavigateCallback) {
        onNavigateCallback('priorities');
      }

      return true;
    }

    if (action === 'create_note') {
      let noteText =
        searchParams.get('text') ||
        searchParams.get('note') ||
        searchParams.get('content') ||
        searchParams.get('title') ||
        '';

      noteText = decodeURIComponent(noteText).trim();
      if (!noteText) {
        noteText = 'Заметка от Google Assistant';
      }

      // Read current note for today
      const currentSaved = localStorage.getItem(`sumire_note_${today}`) || '';
      const updatedNote = currentSaved
        ? `${currentSaved}\n• ${noteText}`
        : `• ${noteText}`;

      localStorage.setItem(`sumire_note_${today}`, updatedNote);

      // Dispatch event to reactive listeners (e.g. DailyMoodAndNote)
      window.dispatchEvent(
        new CustomEvent('sumire:note-updated', {
          detail: { date: today, text: updatedNote },
        })
      );

      // Log in activity feed
      await db.activityLogs.add({
        timestamp: Date.now(),
        date: today,
        action: 'created',
        entity: 'system',
        title: noteText.length > 35 ? noteText.slice(0, 35) + '...' : noteText,
        details: 'Запись в блокнот (Google / Gemini)',
      });

      playSuccessChime();

      if (onToastCallback) {
        onToastCallback({
          id: String(Date.now()),
          title: 'Google / Gemini: Заметка сохранена',
          subtitle: noteText,
          type: 'note',
        });
      }

      if (onNavigateCallback) {
        onNavigateCallback('priorities');
      }

      return true;
    }

    if (action === 'start_focus') {
      const durationParam =
        searchParams.get('duration') ||
        searchParams.get('minutes') ||
        searchParams.get('time') ||
        '25';

      let minutes = parseInt(durationParam, 10);
      if (isNaN(minutes) || minutes <= 0) {
        // Fallback check: e.g. PT25M ISO duration
        const match = durationParam.match(/(\d+)/);
        minutes = match ? parseInt(match[1], 10) : 25;
      }

      // Navigate to focus tab
      if (onNavigateCallback) {
        onNavigateCallback('focus');
      }

      // Dispatch event to FocusPage
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('sumire:focus-start', {
            detail: { minutes },
          })
        );
      }, 150);

      playClickSound();

      if (onToastCallback) {
        onToastCallback({
          id: String(Date.now()),
          title: 'Google / Gemini: Фокус запущен',
          subtitle: `${minutes} минут концентрации`,
          type: 'focus',
        });
      }

      return true;
    }

    if (action === 'open_feature') {
      const feature = (searchParams.get('feature') || '').toLowerCase();

      if (feature === 'habits') {
        onNavigateCallback?.('habits');
      } else if (feature === 'focus') {
        onNavigateCallback?.('focus');
      } else if (feature === 'backlog') {
        onNavigateCallback?.('backlog');
      } else if (feature === 'stats') {
        onNavigateCallback?.('stats');
      } else if (feature === 'notes' || feature === 'priorities') {
        onNavigateCallback?.('priorities');
      } else if (feature === 'scale') {
        window.dispatchEvent(new CustomEvent('sumire:open-scale-modal'));
      }

      if (onToastCallback) {
        onToastCallback({
          id: String(Date.now()),
          title: 'Google / Gemini',
          subtitle: `Открыт раздел: ${feature || 'Главная'}`,
          type: 'feature',
        });
      }

      return true;
    }

    return false;
  } catch (err) {
    console.error('Failed to handle assistant uri:', rawUri, err);
    return false;
  }
}

/**
 * Initializes the assistant bridge listeners
 */
export function initAssistantService(
  onNavigate: NavigateCallback,
  onToast: ToastCallback
) {
  registerAssistantCallbacks(onNavigate, onToast);

  // 1. Expose global hook for native MainActivity evaluateJavascript
  (window as any).__onAssistantIntent = (uri: string) => {
    handleAssistantUri(uri);
  };

  // 2. Check if native bridge has a cold-started pending intent
  try {
    const nativeAssistant = (window as any).AndroidAssistant;
    if (nativeAssistant && typeof nativeAssistant.getPendingAssistantIntent === 'function') {
      const pendingUri = nativeAssistant.getPendingAssistantIntent();
      if (pendingUri) {
        handleAssistantUri(pendingUri);
      }
    }
  } catch (e) {
    console.error('Error checking native assistant intent:', e);
  }

  // 3. Listen for browser/web hash or custom events
  const handleCustomEvent = (e: any) => {
    if (e.detail?.uri) {
      handleAssistantUri(e.detail.uri);
    }
  };
  window.addEventListener('kairo:assistant-intent', handleCustomEvent);

  return () => {
    window.removeEventListener('kairo:assistant-intent', handleCustomEvent);
  };
}
