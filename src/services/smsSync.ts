import { PermissionsAndroid, Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { AppStorage } from '../storage/mmkv';
import { SmartOfflineSMSParser } from './smsParser';

interface RawSmsMessage {
  id: string;
  address: string;
  body: string;
  date: number;
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: 'SMS Access',
    message:
      'MoneyFlow AI reads your bank SMS locally on this device to auto-detect transactions. Nothing is uploaded anywhere.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny'
  });

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function readInboxSms(maxCount = 1000): Promise<RawSmsMessage[]> {
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox', maxCount }),
      (fail: string) => reject(new Error(fail)),
      (_count: number, smsList: string) => {
        const raw = JSON.parse(smsList) as Array<{ _id: number | string; address: string; body: string; date: number }>;
        resolve(
          raw.map((m) => ({
            id: String(m._id),
            address: m.address,
            body: m.body,
            date: Number(m.date)
          }))
        );
      }
    );
  });
}

export async function syncSmsTransactions(): Promise<{ added: number; total: number }> {
  const hasPermission = await requestSmsPermission();
  if (!hasPermission) {
    throw new Error('SMS permission was not granted.');
  }

  const messages = await readInboxSms();
  const parsedIds = new Set(AppStorage.getParsedSMSIds());
  const existingTransactions = AppStorage.getTransactions();

  const newTransactions = [];
  const newParsedIds: string[] = [];

  for (const msg of messages) {
    if (parsedIds.has(msg.id)) continue;
    newParsedIds.push(msg.id);
    const tx = SmartOfflineSMSParser.parseSMS(msg.id, msg.body, msg.date);
    if (tx) newTransactions.push(tx);
  }

  if (newTransactions.length > 0) {
    AppStorage.saveTransactions([...newTransactions, ...existingTransactions]);
  }
  if (newParsedIds.length > 0) {
    AppStorage.saveParsedSMSIds([...parsedIds, ...newParsedIds]);
  }

  const settings = AppStorage.getSettings();
  AppStorage.saveSettings({ ...settings, smsPermissionGranted: true });

  return { added: newTransactions.length, total: existingTransactions.length + newTransactions.length };
}
