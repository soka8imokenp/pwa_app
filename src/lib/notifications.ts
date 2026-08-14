// Web Notifications API Helper for Focus Timers & Daily Reminders

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function sendLocalNotification(title: string, body: string, icon = '/icons/icon-192x192.png') {
  if (!isNotificationSupported()) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon,
        badge: icon,
        silent: false,
      });
    } catch {
      // Fallback for Service Worker notification
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, { body, icon });
        });
      }
    }
  }
}
