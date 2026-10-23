import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { verifyGoogleToken } from './googleVerify.js';

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

const DUMMY_HASH = '$2b$10$/O0ntnxJO3mz3OY9mJcRYufl2JuLOocjpxA5D4ctGQEB6J/VKnkbi';

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
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

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

  // Compare against a dummy hash when the user doesn't exist so response time doesn't reveal registered e-mails.
  const isMatch = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user) {
    throw new Error('Invalid email or password');
  }

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
  if (!providedRefreshToken || typeof providedRefreshToken !== 'string' || providedRefreshToken.length > 2048) {
    throw new Error('Refresh token is required');
  }

  const sep = providedRefreshToken.indexOf('_');
  const jwtPart = sep >= 0 ? providedRefreshToken.slice(sep + 1) : providedRefreshToken;

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
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  // Every valid refresh token is stored at issue time. Unknown = forged or already purged.
  if (!record || record.userId !== decoded.userId) {
    throw new Error('Refresh token is not recognised. Please sign in again.');
  }
  if (record.revokedAt) {
    // Re-use of a rotated token means it was stolen (or replayed): kill every session of this user.
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new Error('Refresh token has already been used. All sessions were signed out for safety.');
  }
  if (new Date() > record.expiresAt) {
    throw new Error('Refresh token has expired');
  }

  // Rotate: revoke the presented token atomically (guards against two parallel refreshes).
  const revoked = await prisma.refreshToken.updateMany({
    where: { id: record.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revoked.count !== 1) {
    throw new Error('Refresh token has already been used');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) {
    throw new Error('User associated with this token no longer exists');
  }

  const newTokens = await generateTokenPair(user.id, user.email);
  return { user: publicUser(user), ...newTokens };
}

/**
 * Revokes a refresh token on logout
 */
export async function logoutUser(providedRefreshToken?: string) {
  if (providedRefreshToken) {
    try {
      const tokenHash = hashToken(providedRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
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
 * Authenticates or registers a user via a Google ID token or access token.
 * The token must be issued to our own OAuth client (see verifyGoogleToken).
 */
export async function authenticateWithGoogle(idToken: string) {
  const g = await verifyGoogleToken(idToken);
  if (!g.emailVerified) {
    throw new Error('Google account email is not verified');
  }

  let user = await prisma.user.findUnique({ where: { email: g.email } });

  if (!user) {
    // Random, unguessable password: the account is Google-only until the user sets one.
    const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    const firstName = g.givenName || (g.name ? g.name.split(' ')[0] : 'Sumire');
    const lastName = g.familyName || (g.name ? g.name.split(' ').slice(1).join(' ') : null);

    const usernameBase = (g.email.split('@')[0] || `user_${Date.now().toString(36)}`)
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .slice(0, 24);
    let username = usernameBase;
    for (let i = 1; await prisma.user.findUnique({ where: { username } }); i++) {
      username = `${usernameBase}_${i}`;
    }

    user = await prisma.user.create({
      data: {
        email: g.email,
        passwordHash: hashedPassword,
        firstName,
        lastName: lastName || null,
        username,
        avatarUrl: g.picture || undefined,
        themeAccent: '#3D6B52',
        soundEnabled: true,
      },
    });
  } else if (!user.avatarUrl && g.picture) {
    user = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: g.picture } });
  }

  const tokens = await generateTokenPair(user.id, user.email);
  return { user: publicUser(user), ...tokens };
}

/**
 * Links a Google account to the signed-in profile. Changing the e-mail is only allowed to a
 * verified Google address that no other account uses.
 */
export async function linkGoogleAccount(userId: string, idToken: string) {
  const g = await verifyGoogleToken(idToken);
  if (!g.emailVerified) {
    throw new Error('Google account email is not verified');
  }

  const existingEmailUser = await prisma.user.findUnique({ where: { email: g.email } });
  if (existingEmailUser && existingEmailUser.id !== userId) {
    throw new Error('This Google account is already associated with another user account.');
  }

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) {
    throw new Error('Current user profile not found.');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      email: g.email,
      avatarUrl: g.picture || currentUser.avatarUrl || undefined,
    },
  });

  return { success: true, user: publicUser(updatedUser) };
}

function publicUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  avatarUrl?: string | null;
  themeAccent: string;
  soundEnabled: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    avatarUrl: user.avatarUrl ?? null,
    themeAccent: user.themeAccent,
    soundEnabled: user.soundEnabled,
  };
}
