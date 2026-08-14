import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { savePushSubscription, sendPushNotificationToUser } from '../services/push.service.js';
import { config } from '../config/env.js';

export const pushRouter = Router();

// Get public VAPID key
pushRouter.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: config.vapid.publicKey });
});

// Subscribe to Web Push
pushRouter.post('/subscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const subscription = req.body;
    await savePushSubscription(req.user!.userId, subscription);
    res.json({ success: true, message: 'Subscription saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save subscription' });
  }
});

// Send test notification
pushRouter.post('/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title = '⚡ Pragmatic Planner', body = 'Test push notification active!' } = req.body;
    await sendPushNotificationToUser(req.user!.userId, title, body);
    res.json({ success: true, message: 'Notification sent' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send notification' });
  }
});
