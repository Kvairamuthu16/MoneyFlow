import { DeviceEventEmitter } from 'react-native';
import { initializeStorage, AppStorage } from '../../storage/mmkv';
import { TransactionImportService } from './TransactionImportService';
import { persistImportOutcome } from './ImportPersistence';
import { RawSmsMessage } from './types';
import { NotificationOrchestrator } from '../notifications';

/** Emitted after a background-imported transaction is persisted, so a foregrounded app can refresh live instead of waiting for the next manual sync. */
export const TRANSACTIONS_UPDATED_EVENT = 'MoneyFlowTransactionsUpdated';

export interface BackgroundSmsTaskData {
  id: string;
  address: string;
  body: string;
  timestampMs: number;
}

/**
 * Entry point for the native real-time SMS listener (see
 * android/.../SmsReceiver.kt + SmsHeadlessTaskService.kt). Registered as a
 * React Native "headless task" in index.js -- Android starts a JS engine
 * instance just long enough to run this function whenever a single new SMS
 * arrives, whether or not the app is open. Runs the exact same pipeline as
 * SmsSyncWorker's manual scan, just for one message instead of a batch read
 * from the inbox.
 */
export async function backgroundSmsTask(data: BackgroundSmsTaskData): Promise<void> {
  await initializeStorage();

  const message: RawSmsMessage = { id: data.id, address: data.address, body: data.body, date: data.timestampMs };
  const parsedIds = new Set(AppStorage.getParsedSMSIds());
  const existingTransactions = AppStorage.getTransactions();
  const { storeRawSmsBody } = AppStorage.getSettings();

  const outcome = await TransactionImportService.importMessages([message], existingTransactions, parsedIds, undefined, { storeRawSmsBody });
  persistImportOutcome(outcome, existingTransactions, parsedIds);

  if (outcome.newTransactions.length > 0) {
    DeviceEventEmitter.emit(TRANSACTIONS_UPDATED_EVENT);
    const allTransactions = [...outcome.newTransactions, ...existingTransactions];
    await NotificationOrchestrator.onTransactionsImported(outcome.newTransactions, allTransactions, AppStorage.getBudgets());
  }
}

export default backgroundSmsTask;
