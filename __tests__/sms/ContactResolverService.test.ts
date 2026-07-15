import { Platform, PermissionsAndroid } from 'react-native';
import Contacts from 'react-native-contacts';
import { ContactResolverService } from '../../src/services/sms/ContactResolverService';

describe('ContactResolverService', () => {
  const originalOS = Platform.OS;

  beforeAll(() => {
    Platform.OS = 'android';
  });

  afterAll(() => {
    Platform.OS = originalOS;
  });

  beforeEach(() => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
    (Contacts.getContactsByPhoneNumber as jest.Mock).mockReset();
    (Contacts.getContactsByEmailAddress as jest.Mock).mockReset();
  });

  it('resolves a phone number to a device contact name', async () => {
    (Contacts.getContactsByPhoneNumber as jest.Mock).mockResolvedValue([{ displayName: 'John Kumar' }]);

    const name = await ContactResolverService.resolveByPhoneNumber('9876543210');

    expect(name).toBe('John Kumar');
  });

  it('returns undefined when no contact matches', async () => {
    (Contacts.getContactsByPhoneNumber as jest.Mock).mockResolvedValue([]);

    expect(await ContactResolverService.resolveByPhoneNumber('9876543210')).toBeUndefined();
  });

  it('returns undefined without ever calling the native module when contacts permission is not granted', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);

    const name = await ContactResolverService.resolveByPhoneNumber('9876543210');

    expect(name).toBeUndefined();
    expect(Contacts.getContactsByPhoneNumber).not.toHaveBeenCalled();
  });

  it('never throws, even if the native module rejects', async () => {
    (Contacts.getContactsByPhoneNumber as jest.Mock).mockRejectedValue(new Error('native failure'));

    await expect(ContactResolverService.resolveByPhoneNumber('9876543210')).resolves.toBeUndefined();
  });

  it('falls back to email lookup when no phone number is available', async () => {
    (Contacts.getContactsByEmailAddress as jest.Mock).mockResolvedValue([{ displayName: 'Jane Doe' }]);

    const name = await ContactResolverService.resolve({ emailAddress: 'jane@example.com' });

    expect(name).toBe('Jane Doe');
  });

  it('prefers a phone-number match over falling back to email', async () => {
    (Contacts.getContactsByPhoneNumber as jest.Mock).mockResolvedValue([{ displayName: 'John Kumar' }]);
    (Contacts.getContactsByEmailAddress as jest.Mock).mockResolvedValue([{ displayName: 'Jane Doe' }]);

    const name = await ContactResolverService.resolve({ mobileNumber: '9876543210', emailAddress: 'jane@example.com' });

    expect(name).toBe('John Kumar');
  });
});
