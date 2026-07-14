import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Requests READ_SMS only, with a rationale shown before the OS dialog.
 * RECEIVE_SMS is intentionally not requested here -- this app does not
 * (yet) run a background listener, and asking for a permission it doesn't
 * use would be a red flag in review and to the user.
 */
export const SmsPermissionService = {
  async request(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
      title: 'SMS Access',
      message:
        'MoneyFlow AI reads your bank SMS locally on this device to auto-detect transactions. Nothing is uploaded anywhere.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny'
    });

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  },

  async has(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  }
};
