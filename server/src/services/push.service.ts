import webpush from 'web-push';
import { prisma } from '../lib/prisma.js';
import { config, pushEnabled } from '../config/env.js';

if (pushEnabled) {
  webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
} else {
  console.warn('[push] VAPID keys not configured – web push is disabled');
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function savePushSubscription(userId: string, subscription: PushSubscriptionInput) {
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: subscription.endpoint },
  });

  if (existing) {
    return prisma.pushSubscription.update({
      where: { endpoint: subscription.endpoint },
      data: {
        userId,
        keysJson: JSON.stringify(subscription.keys || {}),
      },
    });
  }

  return prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: subscription.endpoint,
      keysJson: JSON.stringify(subscription.keys || {}),
    },
  });
}

export async function sendPushNotificationToUser(userId: string, title: string, body: string) {
  if (!pushEnabled) throw new Error('Web push is not configured on this server');
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192x192.png',
  });

  for (const sub of subscriptions) {
    try {
      const keys = JSON.parse(sub.keysJson || '{}');
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys,
        },
        payload
      );
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Subscription has expired or is invalid, remove from DB
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }
}
