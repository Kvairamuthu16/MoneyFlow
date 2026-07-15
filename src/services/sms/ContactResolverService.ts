import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

/**
 * Resolves a phone number or email extracted from a transaction SMS against
 * the device's own contacts, so "Paid To: 9876543210@ybl" can instead show
 * "Paid To: John Kumar". Contacts access is optional -- if the user never
 * grants it, this silently returns undefined everywhere and the raw
 * UPI ID/number is shown instead (see PartyLabelService for the user's own
 * rename-without-touching-contacts override on top of that).
 */
export const ContactResolverService = {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS, {
      title: 'Contacts Access',
      message: 'MoneyFlow AI can match UPI IDs and phone numbers in your transactions against your contacts, so you see names instead of numbers. This stays entirely on your device.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny'
    });

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  },

  async hasPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
  },

  async resolveByPhoneNumber(phoneNumber: string): Promise<string | undefined> {
    try {
      if (!(await ContactResolverService.hasPermission())) return undefined;
      const matches = await Contacts.getContactsByPhoneNumber(phoneNumber);
      return matches[0]?.displayName || undefined;
    } catch {
      // Contact lookup is a convenience, never a hard dependency for import.
      return undefined;
    }
  },

  async resolveByEmail(email: string): Promise<string | undefined> {
    try {
      if (!(await ContactResolverService.hasPermission())) return undefined;
      const matches = await Contacts.getContactsByEmailAddress(email);
      return matches[0]?.displayName || undefined;
    } catch {
      return undefined;
    }
  },

  /** Tries the most reliable signal first (phone number), falling back to email. */
  async resolve(fields: { mobileNumber?: string; emailAddress?: string }): Promise<string | undefined> {
    if (fields.mobileNumber) {
      const byPhone = await ContactResolverService.resolveByPhoneNumber(fields.mobileNumber);
      if (byPhone) return byPhone;
    }
    if (fields.emailAddress) {
      return ContactResolverService.resolveByEmail(fields.emailAddress);
    }
    return undefined;
  }
};
