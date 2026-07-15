import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Requests READ_SMS (required for manual scan/refresh) and RECEIVE_SMS
 * (required for the real-time background listener, see
 * android/.../SmsReceiver.kt), each with its own rationale shown before the
 * OS dialog. RECEIVE_SMS is requested but not required -- a denial there
 * just means the app falls back to manual scan/refresh only, since READ_SMS
 * alone is enough for that.
 */
export const SmsPermissionService = {
  async request(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    const readGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
      title: 'SMS Access',
      message: 'MoneyFlow AI reads your bank SMS locally on this device to auto-detect transactions. Nothing is uploaded anywhere.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny'
    });

    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, {
      title: 'Real-Time SMS Detection',
      message:
        'Allow MoneyFlow AI to detect new bank SMS the instant they arrive, instead of only when you manually refresh. This stays entirely on your device.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny'
    });

    return readGranted === PermissionsAndroid.RESULTS.GRANTED;
  },

  async has(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  },

  async hasRealtimePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
  }
};
