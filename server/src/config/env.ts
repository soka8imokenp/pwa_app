import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

/**
 * Secrets are never defaulted in production: a hard-coded fallback in a public repository is
 * equivalent to no secret at all (anyone could mint valid JWTs). In development a random value is
 * generated per process, so tokens simply stop working after a restart.
 */
function secret(name: string, minLength = 32): string {
  const value = process.env[name];
  if (value && value.length >= minLength) return value;
  if (isProduction) {
    throw new Error(`[config] ${name} must be set to at least ${minLength} characters in production`);
  }
  if (value) {
    console.warn(`[config] ${name} is shorter than ${minLength} characters – OK for development only`);
    return value;
  }
  console.warn(`[config] ${name} not set – using a random development secret`);
  return crypto.randomBytes(48).toString('hex');
}

function list(value: string | undefined, fallback: string): string[] {
  return (value || fallback)
    .split(',')
    .map((s) => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

const jwtSecret = secret('JWT_SECRET');
const jwtRefreshSecret = secret('JWT_REFRESH_SECRET');
if (jwtSecret === jwtRefreshSecret) {
  throw new Error('[config] JWT_SECRET and JWT_REFRESH_SECRET must be different');
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret,
  jwtRefreshSecret,
  corsOrigins: list(
    process.env.CORS_ORIGIN,
    'http://localhost:5173,http://localhost:4173,http://localhost:3000,capacitor://localhost,https://localhost'
  ),
  nodeEnv,
  isProduction,
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  // Comma-separated list: web client ID first, then Android/iOS client IDs if they differ.
  googleClientIds: list(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID, ''),
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@kawaii.uz',
  },
};

export const pushEnabled = Boolean(config.vapid.publicKey && config.vapid.privateKey);
