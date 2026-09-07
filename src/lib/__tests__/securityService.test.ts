import { describe, it, expect, beforeEach } from 'vitest';
import { hashPin, savePin, verifyPin, removePin, isPinSet } from '../securityService';

describe('securityService', () => {
  const localStore: Record<string, string> = {};
  const sessionStore: Record<string, string> = {};

  beforeEach(() => {
    if (typeof window === 'undefined' || !(globalThis as any).window?.localStorage) {
      (globalThis as any).window = {
        localStorage: {
          getItem: (k: string) => localStore[k] ?? null,
          setItem: (k: string, v: string) => { localStore[k] = String(v); },
          removeItem: (k: string) => { delete localStore[k]; },
          clear: () => {
            Object.keys(localStore).forEach((k) => delete localStore[k]);
          },
        },
        sessionStorage: {
          getItem: (k: string) => sessionStore[k] ?? null,
          setItem: (k: string, v: string) => { sessionStore[k] = String(v); },
          removeItem: (k: string) => { delete sessionStore[k]; },
          clear: () => {
            Object.keys(sessionStore).forEach((k) => delete sessionStore[k]);
          },
        },
      };
      (globalThis as any).localStorage = (globalThis as any).window.localStorage;
      (globalThis as any).sessionStorage = (globalThis as any).window.sessionStorage;
    }
    Object.keys(localStore).forEach((k) => delete localStore[k]);
    Object.keys(sessionStore).forEach((k) => delete sessionStore[k]);
  });

  it('hashPin: returns deterministic SHA-256 hash', async () => {
    const hash1 = await hashPin('1234');
    const hash2 = await hashPin('1234');
    const hashDiff = await hashPin('4321');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDiff);
    expect(hash1).toHaveLength(64); // 256 bits in hex is 64 characters
  });

  it('savePin and verifyPin: correctly stores and authenticates candidate PIN', async () => {
    expect(isPinSet()).toBe(false);

    await savePin('2580');
    expect(isPinSet()).toBe(true);

    const isValid = await verifyPin('2580');
    const isWrong = await verifyPin('0000');

    expect(isValid).toBe(true);
    expect(isWrong).toBe(false);
  });

  it('removePin: resets lock state', async () => {
    await savePin('9999');
    expect(isPinSet()).toBe(true);

    removePin();
    expect(isPinSet()).toBe(false);
  });
});
