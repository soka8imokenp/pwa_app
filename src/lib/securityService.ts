// 100% Local Security Service for Daily Sumire
// Provides SHA-256 hashed 4-digit PIN protection & Native Android Biometrics (Fingerprint / Face ID)

import { NativeBiometric } from '@capgo/capacitor-native-biometric';

const STORAGE_PIN_HASH = 'kairo_security_pin_hash';
const STORAGE_BIOMETRICS = 'kairo_security_biometrics_enabled';
const SESSION_UNLOCKED = 'kairo_session_unlocked';

/**
 * Computes SHA-256 hash of a string using Web Crypto API
 */
export async function hashPin(pin: string): Promise<string> {
  if (!pin) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(`daily_sumire_salt_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns true if a 4-digit PIN is currently configured
 */
export function isPinSet(): boolean {
  if (typeof window !== 'undefined') {
    return Boolean(localStorage.getItem(STORAGE_PIN_HASH));
  }
  return false;
}

/**
 * Saves a new 4-digit PIN (hashes before storing)
 */
export async function savePin(pin: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const hashed = await hashPin(pin);
    localStorage.setItem(STORAGE_PIN_HASH, hashed);
    // Mark current session as unlocked so user isn't immediately locked out during setup
    sessionStorage.setItem(SESSION_UNLOCKED, 'true');
  }
}

/**
 * Verifies a candidate PIN against stored hash
 */
export async function verifyPin(candidatePin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const storedHash = localStorage.getItem(STORAGE_PIN_HASH);
  if (!storedHash) return true; // No PIN set
  const candidateHash = await hashPin(candidatePin);
  return candidateHash === storedHash;
}

/**
 * Removes the PIN and disables biometrics
 */
export function removePin(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_PIN_HASH);
    localStorage.removeItem(STORAGE_BIOMETRICS);
    sessionStorage.removeItem(SESSION_UNLOCKED);
  }
}

/**
 * Checks if Biometrics (Fingerprint / Face Unlock / Touch ID) is available on device
 */
export async function isBiometricsSupported(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const result = await NativeBiometric.isAvailable();
    return Boolean(result && result.isAvailable);
  } catch (err) {
    // Fallback: Check WebAuthn in browser
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Returns true if user enabled Biometrics in settings
 */
export function isBiometricsEnabled(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_BIOMETRICS) === 'true';
  }
  return false;
}

/**
 * Enables or disables Biometrics toggle
 */
export function setBiometricsEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_BIOMETRICS, String(enabled));
  }
}

/**
 * Registers / Tests biometric credentials on device
 */
export async function registerBiometrics(): Promise<boolean> {
  try {
    // Verify biometrics work right now to confirm enrollment
    const isAvail = await isBiometricsSupported();
    if (!isAvail) {
      setBiometricsEnabled(true);
      return true;
    }

    await NativeBiometric.verifyIdentity({
      reason: 'Подтвердите отпечаток пальца для включения защиты',
      title: 'Daily Sumire',
      subtitle: 'Настройка биометрии',
      description: 'Прикоснитесь к сканеру отпечатков пальцев',
    });

    setBiometricsEnabled(true);
    return true;
  } catch (err) {
    console.warn('Native biometric registration prompt cancelled or failed:', err);
    // If user cancelled, don't enable; if error on desktop web, enable preference
    if (typeof window !== 'undefined' && !(window as any).Capacitor?.isNativePlatform()) {
      setBiometricsEnabled(true);
      return true;
    }
    return false;
  }
}

/**
 * Authenticates user via native device Fingerprint / Face Unlock
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (typeof window === 'undefined' || !isBiometricsEnabled()) {
    return false;
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Разблокируйте приложение Daily Sumire',
      title: 'Daily Sumire',
      subtitle: 'Вход по отпечатку пальца',
      description: 'Прикоснитесь к сканеру отпечатков пальцев',
    });
    return true;
  } catch (err) {
    console.warn('Native biometric authentication failed or cancelled:', err);

    // Fallback for desktop browser WebAuthn testing if available
    if (typeof window !== 'undefined' && window.PublicKeyCredential && !(window as any).Capacitor?.isNativePlatform()) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const assertion = await navigator.credentials.get({
          publicKey: { challenge, timeout: 60000, userVerification: 'preferred' },
        });
        return Boolean(assertion);
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Check if the application is currently locked.
 * If PIN is configured and session is not yet unlocked, returns true.
 */
export function isAppLocked(): boolean {
  if (typeof window !== 'undefined') {
    if (!isPinSet()) return false;
    const sessionUnlocked = sessionStorage.getItem(SESSION_UNLOCKED);
    return sessionUnlocked !== 'true';
  }
  return false;
}

/**
 * Set the app lock state for the current session
 */
export function setAppLocked(locked: boolean): void {
  if (typeof window !== 'undefined') {
    if (locked) {
      sessionStorage.removeItem(SESSION_UNLOCKED);
    } else {
      sessionStorage.setItem(SESSION_UNLOCKED, 'true');
    }
  }
}
