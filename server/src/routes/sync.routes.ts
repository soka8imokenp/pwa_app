import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { processSyncPush, processSyncPull } from '../services/sync.service.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { syncPushPayloadSchema } from '../schemas/sync.schema.js';

export const syncRouter = Router();

// Push local offline mutations to cloud database with Zod validation
syncRouter.post('/push', authMiddleware, validateBody(syncPushPayloadSchema), async (req: AuthRequest, res: Response) => {
  try {
    const result = await processSyncPush(req.user!.userId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sync push failed' });
  }
});

// Pull cloud updates since last client timestamp
syncRouter.get('/pull', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const since = req.query.since ? Number(req.query.since) : undefined;
    const result = await processSyncPull(req.user!.userId, since);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sync pull failed' });
  }
});
