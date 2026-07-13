import 'react-native-get-random-values';
import * as Keychain from 'react-native-keychain';

// react-native-get-random-values ships no type declarations; it polyfills
// global.crypto.getRandomValues at runtime (RN has no built-in Web Crypto).
declare const crypto: { getRandomValues<T extends ArrayBufferView>(array: T): T };

const KEYCHAIN_SERVICE = 'com.moneyflowai.storageKey';
const KEYCHAIN_USERNAME = 'moneyflow-ai';

function generateRandomKey(): string {
  // 256-bit random key, hex-encoded.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Returns the MMKV encryption key, generating and persisting a new random
 * one in the platform Keychain/Keystore on first launch. Replaces the
 * previous hardcoded-in-source key, which provided no real protection since
 * it was compiled identically into every install of the app.
 */
export async function getOrCreateStorageKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (existing && existing.password) {
    return existing.password;
  }

  const newKey = generateRandomKey();
  await Keychain.setGenericPassword(KEYCHAIN_USERNAME, newKey, { service: KEYCHAIN_SERVICE });
  return newKey;
}
