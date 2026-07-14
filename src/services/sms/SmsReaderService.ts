import SmsAndroid from 'react-native-get-sms-android';
import { RawSmsMessage } from './types';

export interface ReadInboxOptions {
  minDate?: number;
  maxDate?: number;
  maxCount?: number;
}

/** Thin wrapper over the native SMS content-provider bridge -- the only place that talks to react-native-get-sms-android directly. */
export const SmsReaderService = {
  readInbox(options: ReadInboxOptions = {}): Promise<RawSmsMessage[]> {
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
};
