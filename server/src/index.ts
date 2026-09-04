import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { pushRouter } from './routes/push.routes.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';

const app = express();

// Trust reverse proxy for accurate IP resolution in rate limiting
app.set('trust proxy', 1);

// 1. Production Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// 2. Strict & Configurable CORS
const allowedOrigins = config.corsOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile Capacitor native requests, cron, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*') return true;
        if (origin === allowed) return true;
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
        if (origin === 'capacitor://localhost' || origin === 'https://localhost') return true;
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS security policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Body Parsing
app.use(express.json({ limit: '10mb' }));

// 4. Structured HTTP Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    console.log(`[${new Date().toISOString()}] [${level}] [HTTP] ${method} ${originalUrl} ${status} - ${duration}ms (${ip})`);
  });

  next();
});

// 5. Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: Date.now(),
    service: 'Daily Sumire Sync Server',
  });
});

// 6. Routes
app.use('/api/auth', authRouter);
app.use('/api/sync', generalApiLimiter, syncRouter);
app.use('/api/push', generalApiLimiter, pushRouter);

// 7. Global Centralized Error Handling
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isCorsError = err.message && err.message.includes('CORS');
  const status = err.status || (isCorsError ? 403 : 500);

  console.error(`💥 [${new Date().toISOString()}] [ERROR] [${req.method} ${req.originalUrl}]`, err.stack || err.message);

  res.status(status).json({
    error: err.message || 'Internal server error',
    code: isCorsError ? 'CORS_FORBIDDEN' : err.code || 'INTERNAL_ERROR',
    timestamp: Date.now(),
  });
});

// 8. Start Server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Daily Sumire Backend Server running at http://localhost:${config.port} (${config.nodeEnv})`);
});
