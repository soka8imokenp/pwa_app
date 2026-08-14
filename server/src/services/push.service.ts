import webpush from 'web-push';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';

webpush.setVapidDetails(
  config.vapid.subject,
  config.vapid.publicKey,
  config.vapid.privateKey
);

export async function savePushSubscription(userId: string, subscription: any) {
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
