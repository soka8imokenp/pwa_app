import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a short-lived access token (15m) and a rotatable refresh token (30d)
 */
export async function generateTokenPair(userId: string, email: string) {
  // 1. Short-lived access token (15 minutes)
  const accessToken = jwt.sign(
    { userId, email },
    config.jwtSecret,
    { expiresIn: '15m' }
  );

  // 2. Long-lived cryptographically secure refresh token (30 days)
  const randomJti = crypto.randomUUID();
  const refreshJwt = jwt.sign(
    { userId, jti: randomJti, type: 'refresh' },
    config.jwtRefreshSecret,
    { expiresIn: '30d' }
  );
  const rawRefreshToken = `${randomJti}_${refreshJwt}`;
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 3. Persist hashed refresh token for revocation and rotation tracking
  try {
    if ((prisma as any).refreshToken) {
      await (prisma as any).refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
        },
      });
    }
  } catch (err) {
    console.warn('RefreshToken table persistence skipped (will rely on signed JWT signature):', err);
  }

  return {
    accessToken,
    token: accessToken, // Backward compatibility with previous API clients
    refreshToken: rawRefreshToken,
    expiresIn: 15 * 60, // 900 seconds
  };
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

  const tokens = await generateTokenPair(user.id, user.email);

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
    ...tokens,
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

  const tokens = await generateTokenPair(user.id, user.email);

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
    ...tokens,
  };
}

/**
 * Exchanges a valid, unrevoked refresh token for a fresh token pair (Rotation Flow)
 */
export async function refreshUserToken(providedRefreshToken: string) {
  if (!providedRefreshToken || typeof providedRefreshToken !== 'string') {
    throw new Error('Refresh token is required');
  }

  const parts = providedRefreshToken.split('_');
  const jwtPart = parts.length > 1 ? parts.slice(1).join('_') : parts[0];

  let decoded: any;
  try {
    decoded = jwt.verify(jwtPart, config.jwtRefreshSecret);
  } catch {
    throw new Error('Invalid or expired refresh token');
  }

  if (!decoded || !decoded.userId || decoded.type !== 'refresh') {
    throw new Error('Invalid refresh token payload');
  }

  const tokenHash = hashToken(providedRefreshToken);

  // Check revocation if table exists
  try {
    if ((prisma as any).refreshToken) {
      const record = await (prisma as any).refreshToken.findUnique({
        where: { tokenHash },
      });

      if (record) {
        if (record.revokedAt) {
          throw new Error('Refresh token has already been revoked. Please sign in again.');
        }
        if (new Date() > record.expiresAt) {
          throw new Error('Refresh token has expired');
        }

        // Revoke the used token as part of rotation
        await (prisma as any).refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() },
        });
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('revoked')) {
      throw err;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    throw new Error('User associated with this token no longer exists');
  }

  const newTokens = await generateTokenPair(user.id, user.email);

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
    ...newTokens,
  };
}

/**
 * Revokes a refresh token on logout
 */
export async function logoutUser(providedRefreshToken?: string) {
  if (providedRefreshToken) {
    try {
      const tokenHash = hashToken(providedRefreshToken);
      if ((prisma as any).refreshToken) {
        await (prisma as any).refreshToken.updateMany({
          where: { tokenHash, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } catch (err) {
      console.warn('Logout token revocation note:', err);
    }
  }
  return { success: true };
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

/**
 * Authenticates or registers a user via Google OAuth ID Token
 */
export async function authenticateWithGoogle(idToken: string) {
  if (!idToken) {
    throw new Error('Google ID token is required');
  }

  // 1. Verify token with Google public tokeninfo endpoint
  let googlePayload: any;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) {
      throw new Error(`Google token validation failed: ${res.statusText}`);
    }
    googlePayload = await res.json();
  } catch (err: any) {
    throw new Error('Invalid or expired Google authentication token: ' + err.message);
  }

  const { email, given_name, family_name, name, picture, email_verified } = googlePayload;

  if (!email) {
    throw new Error('Google account does not have an associated email');
  }

  if (email_verified === 'false' || email_verified === false) {
    throw new Error('Google account email is not verified');
  }

  // 2. Find or create user in local SQLite/Postgres database
  let user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    const randomPassword = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(randomPassword, 12);
    const firstName = given_name || (name ? name.split(' ')[0] : 'Sumire');
    const lastName = family_name || (name ? name.split(' ').slice(1).join(' ') : 'User');
    const username = email.split('@')[0] || `user_${Date.now().toString(36)}`;

    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        username,
        avatarUrl: picture || undefined,
        themeAccent: '#3D6B52',
        soundEnabled: true,
      },
    });
  } else if (!user.avatarUrl && picture) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: picture },
    });
  }

  // 3. Issue our dual-token pair (15m access, 30d refresh)
  const tokens = await generateTokenPair(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      themeAccent: user.themeAccent,
      soundEnabled: user.soundEnabled,
    },
    ...tokens,
  };
}
