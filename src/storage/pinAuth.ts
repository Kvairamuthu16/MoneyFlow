import { sha256 } from 'js-sha256';
import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'com.moneyflowai.appLockPin';
const KEYCHAIN_USERNAME = 'moneyflow-ai';

function hashPin(pin: string): string {
  return sha256(pin);
}

/** Persists a new PIN (hashed, never stored in plaintext) to the Keychain. */
export async function setPin(pin: string): Promise<void> {
  await Keychain.setGenericPassword(KEYCHAIN_USERNAME, hashPin(pin), { service: KEYCHAIN_SERVICE });
}

export async function hasPin(): Promise<boolean> {
  const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  return !!existing && !!existing.password;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (!existing || !existing.password) return false;
  return existing.password === hashPin(pin);
}

export async function clearPin(): Promise<void> {
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
}
