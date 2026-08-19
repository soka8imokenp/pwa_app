import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { TabView } from '../components/layout/BottomNav';

export interface NotificationPayload {
  id?: number;
  title: string;
  body: string;
  scheduleDate?: Date;
  extra?: {
    tab?: TabView;
    taskId?: number;
    habitId?: number;
    action?: string;
  };
}

// In-app notification event listeners
type InAppNotificationListener = (payload: NotificationPayload) => void;
const inAppListeners: Set<InAppNotificationListener> = new Set();

export function subscribeInAppNotifications(listener: InAppNotificationListener): () => void {
  inAppListeners.add(listener);
  return () => inAppListeners.delete(listener);
}

function broadcastInAppNotification(payload: NotificationPayload) {
  inAppListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.error('In-app notification listener error:', err);
    }
  });
}

/**
 * Initialize Notification Listeners for Android, iOS & Web
 */
export async function initNotificationSystem(onNavigate: (tab: TabView, extra?: any) => void) {
  if (Capacitor.isNativePlatform()) {
    try {
      // Create notification channels on Android
      await LocalNotifications.createChannel({
        id: 'sumire_focus',
        name: 'Sumire Focus & Timers',
        description: 'Notifications for focus sessions, breaks, and reminders',
        importance: 5,
        visibility: 1,
        sound: 'res_finish_chime.wav',
        vibration: true,
      });

      await LocalNotifications.createChannel({
        id: 'sumire_tasks',
        name: 'Sumire Tasks & Habits',
        description: 'Notifications for tasks, top priorities, and routines',
        importance: 4,
        visibility: 1,
        vibration: true,
      });

      // Listen for notification clicks from Android system tray
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const extra = notificationAction.notification.extra;
        if (extra && extra.tab) {
          onNavigate(extra.tab, extra);
        }
      });
    } catch (err) {
      console.warn('Native notification initialization notice:', err);
    }
  }
}

/**
 * Request system notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch {
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Send an immediate local notification & trigger in-app toast
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  extra?: { tab?: TabView; taskId?: number; habitId?: number; action?: string }
) {
  const notificationId = Math.floor(Math.random() * 100000);
  const payload: NotificationPayload = {
    id: notificationId,
    title,
    body,
    extra: extra || { tab: 'priorities' },
  };

  // 1. Broadcast in-app floating toast
  broadcastInAppNotification(payload);

  // 2. Native Capacitor Notification
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title,
            body,
            channelId: extra?.tab === 'focus' ? 'sumire_focus' : 'sumire_tasks',
            extra: extra || { tab: 'priorities' },
            smallIcon: 'ic_launcher_foreground',
            iconColor: '#FFE873',
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('Could not schedule native notification:', err);
    }
  }

  // 3. Web Notification API Fallback
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: extra,
      });

      notif.onclick = () => {
        window.focus();
        if (extra?.tab) {
          // Trigger navigation event
          window.dispatchEvent(new CustomEvent('sumire:navigate', { detail: extra }));
        }
        notif.close();
      };
    } catch {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/icon-192x192.png',
            data: extra,
          });
        });
      }
    }
  }
}

/**
 * Schedule a future reminder notification (e.g. for a specific time or habit)
 */
export async function scheduleTaskReminder(
  title: string,
  body: string,
  scheduleDate: Date,
  extra?: { tab?: TabView; taskId?: number; habitId?: number }
) {
  if (scheduleDate.getTime() <= Date.now()) return;

  const notificationId = Math.floor(Math.random() * 100000);

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title,
            body,
            schedule: { at: scheduleDate },
            channelId: 'sumire_tasks',
            extra: extra || { tab: 'priorities' },
            smallIcon: 'ic_launcher_foreground',
            iconColor: '#FFE873',
          },
        ],
      });
    } catch (err) {
      console.warn('Could not schedule task reminder:', err);
    }
  }
}
