import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { savePushSubscription, sendPushNotificationToUser } from '../services/push.service.js';
import { z } from 'zod';
import { config, pushEnabled } from '../config/env.js';

const SubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith('https://'), 'Push endpoint must be https'),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

const TestSchema = z.object({
  title: z.string().max(80).optional(),
  body: z.string().max(300).optional(),
});

export const pushRouter = Router();

// Get public VAPID key
pushRouter.get('/vapid-public-key', (_req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: 'Web push is not configured' });
  res.json({ publicKey: config.vapid.publicKey });
});

// Subscribe to Web Push
pushRouter.post('/subscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = SubscriptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid push subscription' });
    await savePushSubscription(req.user!.userId, parsed.data);
    res.json({ success: true, message: 'Subscription saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save subscription' });
  }
});

// Send test notification
pushRouter.post('/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = TestSchema.safeParse(req.body ?? {});
    const { title = 'Daily Sumire', body = 'Test push notification active!' } = parsed.success ? parsed.data : {};
    await sendPushNotificationToUser(req.user!.userId, title, body);
    res.json({ success: true, message: 'Notification sent' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send notification' });
  }
});
