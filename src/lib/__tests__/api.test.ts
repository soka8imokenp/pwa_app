import { describe, it, expect, beforeEach } from 'vitest';
import {
  isTokenExpired,
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  clearAuthTokens,
} from '../api';

/**
 * Creates a base64 encoded pseudo-JWT for testing expiry checks
 */
function createFakeJwt(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ userId: 'test_123', exp: expSeconds }));
  return `${header}.${payload}.fake_signature`;
}

describe('api - Token Management & Expiry', () => {
  beforeEach(() => {
    clearAuthTokens();
  });

  describe('isTokenExpired', () => {
    it('returns true for null or empty tokens', () => {
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired('')).toBe(true);
    });

    it('returns true for malformed tokens', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
      expect(isTokenExpired('foo.bar')).toBe(true);
    });

    it('returns true for expired tokens in the past', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const expiredToken = createFakeJwt(pastExp);
      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('returns true for tokens within the 60-second proactive buffer', () => {
      const almostExpiredExp = Math.floor(Date.now() / 1000) + 30; // 30s remaining
      const token = createFakeJwt(almostExpiredExp);
      expect(isTokenExpired(token)).toBe(true);
    });

    it('returns false for valid unexpired tokens with ample time', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 900; // 15 minutes remaining
      const validToken = createFakeJwt(futureExp);
      expect(isTokenExpired(validToken)).toBe(false);
    });
  });

  describe('token storage helpers', () => {
    it('sets and retrieves access token correctly', () => {
      expect(getAuthToken()).toBeNull();
      setAuthToken('access_token_123');
      expect(getAuthToken()).toBe('access_token_123');
    });

    it('sets and retrieves refresh token correctly', () => {
      expect(getRefreshToken()).toBeNull();
      setRefreshToken('refresh_token_xyz');
      expect(getRefreshToken()).toBe('refresh_token_xyz');
    });

    it('clears both tokens on clearAuthTokens', () => {
      setAuthToken('access_123');
      setRefreshToken('refresh_123');
      clearAuthTokens();
      expect(getAuthToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });
});
