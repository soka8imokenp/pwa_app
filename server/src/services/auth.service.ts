import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  username?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export async function registerUser(dto: RegisterDto) {
  const existing = await prisma.user.findUnique({
    where: { email: dto.email.toLowerCase().trim() },
  });

  if (existing) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const user = await prisma.user.create({
    data: {
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName?.trim() || null,
      username: dto.username?.trim() || null,
    },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      themeAccent: user.themeAccent,
      soundEnabled: user.soundEnabled,
    },
    token,
  };
}

export async function loginUser(dto: LoginDto) {
  const user = await prisma.user.findUnique({
    where: { email: dto.email.toLowerCase().trim() },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      themeAccent: user.themeAccent,
      soundEnabled: user.soundEnabled,
    },
    token,
  };
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      avatarUrl: true,
      themeAccent: true,
      soundEnabled: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}
