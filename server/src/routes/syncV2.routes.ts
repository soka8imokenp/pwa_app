import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

export const syncV2Router = Router();

const ENTITIES = [
  'task', 'habit', 'habit_log', 'focus', 'link', 'profile', 'weight', 'meal', 'water', 'workout', 'steps', 'day_note',
] as const;

const RecordSchema = z.object({
  entity: z.enum(ENTITIES),
  id: z.string().min(1).max(120),
  updatedAt: z.number().int().nonnegative(),
  deleted: z.boolean().default(false),
  data: z.string().max(64_000),
});

const PushSchema = z.object({
  records: z.array(RecordSchema).max(2000),
});

/**
 * POST /api/sync/v2/push – upsert records, last-writer-wins on the client timestamp.
 * Idempotent: re-sending the same batch is harmless.
 */
syncV2Router.post('/push', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = PushSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid sync payload', issues: parsed.error.issues.slice(0, 5) });
  const userId = req.user!.userId;
  let applied = 0;
  let skipped = 0;
  try {
    // Chunked transactions keep SQLite locks short.
    const recs = parsed.data.records;
    for (let i = 0; i < recs.length; i += 200) {
      const chunk = recs.slice(i, i + 200);
      await prisma.$transaction(async (tx) => {
        for (const r of chunk) {
          const key = { userId_entity_recordId: { userId, entity: r.entity, recordId: r.id } };
          const existing = await tx.syncRecord.findUnique({ where: key, select: { clientUpdatedAt: true } });
          if (existing && existing.clientUpdatedAt > BigInt(r.updatedAt)) {
            skipped++;
            continue;
          }
          await tx.syncRecord.upsert({
            where: key,
            create: { userId, entity: r.entity, recordId: r.id, data: r.data, clientUpdatedAt: BigInt(r.updatedAt), deleted: r.deleted },
            update: { data: r.data, clientUpdatedAt: BigInt(r.updatedAt), deleted: r.deleted },
          });
          applied++;
        }
      });
    }
    res.json({ applied, skipped, serverTime: Date.now() });
  } catch (err) {
    console.error('[sync v2] push failed', err);
    res.status(500).json({ error: 'Sync push failed' });
  }
});

/**
 * GET /api/sync/v2/pull?since=<serverTime ms>&limit=500 – records changed on the server after `since`.
 * Page with the returned `cursor` while `hasMore` is true.
 */
syncV2Router.get('/pull', authMiddleware, async (req: AuthRequest, res: Response) => {
  const since = Number(req.query.since);
  const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 1000);
  const from = Number.isFinite(since) && since > 0 ? new Date(since) : new Date(0);
  try {
    const rows = await prisma.syncRecord.findMany({
      where: { userId: req.user!.userId, updatedAt: { gt: from } },
      orderBy: { updatedAt: 'asc' },
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    res.json({
      records: page.map((r) => ({
        entity: r.entity,
        id: r.recordId,
        updatedAt: Number(r.clientUpdatedAt),
        deleted: r.deleted,
        data: r.data,
      })),
      cursor: page.length ? page[page.length - 1].updatedAt.getTime() : from.getTime(),
      hasMore: rows.length > limit,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error('[sync v2] pull failed', err);
    res.status(500).json({ error: 'Sync pull failed' });
  }
});
