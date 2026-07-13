import { PermissionsAndroid, Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { AppStorage } from '../storage/mmkv';
import { SmartOfflineSMSParser } from './smsParser';

export type SmsScanRange = 'day' | 'week' | 'month' | 'all';

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

/** Returns the epoch-ms start of the requested scan range, or undefined for 'all' (no lower bound). */
export function getScanRangeStart(range: SmsScanRange, now: Date = new Date()): number | undefined {
  const start = new Date(now);
  switch (range) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    case 'week':
      start.setDate(start.getDate() - 7);
      return start.getTime();
    case 'month':
      start.setDate(start.getDate() - 30);
      return start.getTime();
    case 'all':
    default:
      return undefined;
  }
}

function readInboxSms(options: { minDate?: number; maxDate?: number; maxCount?: number } = {}): Promise<RawSmsMessage[]> {
  const { minDate, maxDate, maxCount = 2000 } = options;
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox', maxCount, ...(minDate !== undefined ? { minDate } : {}), ...(maxDate !== undefined ? { maxDate } : {}) }),
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

export async function syncSmsTransactions(range: SmsScanRange = 'all'): Promise<{ added: number; total: number; scanned: number }> {
  const hasPermission = await requestSmsPermission();
  if (!hasPermission) {
    throw new Error('SMS permission was not granted.');
  }

  const minDate = getScanRangeStart(range);
  const messages = await readInboxSms({ minDate });
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

  return { added: newTransactions.length, total: existingTransactions.length + newTransactions.length, scanned: messages.length };
}
