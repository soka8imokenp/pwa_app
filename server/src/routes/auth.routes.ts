import { Router, Response } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, getUserProfile } from '../services/auth.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

export const authRouter = Router();

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

authRouter.post('/register', async (req, res) => {
  try {
    const validated = RegisterSchema.parse(req.body);
    const result = await registerUser(validated);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const validated = LoginSchema.parse(req.body);
    const result = await loginUser(validated);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

authRouter.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getUserProfile(req.user!.userId);
    res.json({ user: profile });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'User not found' });
  }
});
