import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { pushRouter } from './routes/push.routes.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'Pragmatic Planner Fullstack Sync Server',
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/sync', syncRouter);
app.use('/api/push', pushRouter);

// Start Server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Pragmatic Planner Backend Server running at http://localhost:${config.port}`);
});
