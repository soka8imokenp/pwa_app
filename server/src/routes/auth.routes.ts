import { Router, Response } from 'express';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  getUserProfile,
  refreshUserToken,
  logoutUser,
  authenticateWithGoogle,
} from '../services/auth.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  username: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// 1. Register with Rate Limiting
authRouter.post('/register', authRateLimiter, async (req, res) => {
  try {
    const validated = RegisterSchema.parse(req.body);
    const result = await registerUser(validated);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// 2. Login with Rate Limiting
authRouter.post('/login', authRateLimiter, async (req, res) => {
  try {
    const validated = LoginSchema.parse(req.body);
    const result = await loginUser(validated);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

// 2.1. Google OAuth Sign-In with Rate Limiting
authRouter.post('/google', authRateLimiter, async (req, res) => {
  try {
    const validated = GoogleAuthSchema.parse(req.body);
    const result = await authenticateWithGoogle(validated.idToken);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Google authentication failed' });
  }
});

// 3. Silent Refresh Token Exchange
authRouter.post('/refresh', async (req, res) => {
  try {
    const validated = RefreshSchema.parse(req.body);
    const result = await refreshUserToken(validated.refreshToken);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Token refresh failed' });
  }
});

// 4. Logout / Invalidation
authRouter.post('/logout', async (req, res) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
    await logoutUser(refreshToken);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Logout failed' });
  }
});

// 5. Current User Profile
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getUserProfile(req.user!.userId);
    res.json({ user: profile });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'User not found' });
  }
});
