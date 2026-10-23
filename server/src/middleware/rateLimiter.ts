import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  /** Bucket name – each limiter counts separately. */
  name: string;
  windowMs: number;
  max: number;
  message?: string;
}

interface ClientRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, ClientRecord>();

// Cleanup expired records every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export function createRateLimiter(options: RateLimitOptions) {
  const { name, windowMs, max, message = 'Too many requests. Please try again later.' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // `trust proxy` is set, so req.ip already resolves X-Forwarded-For safely; never read the raw header
    // ourselves, a client could spoof it to get a fresh bucket on every request.
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${name}:${ip}`;
    const now = Date.now();

    let record = memoryStore.get(key);

    if (!record || now > record.resetAt) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      memoryStore.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > max) {
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    next();
  };
}

// Strict rate limiter for authentication endpoints (prevent brute-force password guessing)
export const authRateLimiter = createRateLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per IP per 15 minutes
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

// General API rate limiter
export const refreshRateLimiter = createRateLimiter({
  name: 'refresh',
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many token refreshes. Please try again later.',
});

export const generalApiLimiter = createRateLimiter({
  name: 'api',
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: 'API rate limit exceeded. Please slow down your requests.',
});
