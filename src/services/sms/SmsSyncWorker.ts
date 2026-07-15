import { AppStorage } from '../../storage/mmkv';
import { SmsPermissionService } from './SmsPermissionService';
import { SmsReaderService } from './SmsReaderService';
import { TransactionImportService } from './TransactionImportService';
import { persistImportOutcome } from './ImportPersistence';
import { ImportProgress, ImportResult, SmsScanRange } from './types';
import { NotificationOrchestrator } from '../notifications';

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

/**
 * Ties permission, reading, importing and persistence together for one sync
 * pass. An explicit range (day/week/month) always wins -- the user picked it
 * deliberately. For 'all', an existing sync cursor narrows the read so a
 * routine refresh doesn't re-read the entire inbox just to skip everything
 * by ID again.
 */
export const SmsSyncWorker = {
  async sync(range: SmsScanRange = 'all', onProgress?: (progress: ImportProgress) => void): Promise<ImportResult> {
    const hasPermission = await SmsPermissionService.request();
    if (!hasPermission) {
      throw new Error('SMS permission was not granted.');
    }

    const explicitStart = getScanRangeStart(range);
    const lastSyncedAt = AppStorage.getLastSyncedAt();
    const minDate = range === 'all' && lastSyncedAt ? lastSyncedAt : explicitStart;

    const syncStartedAt = Date.now();
    const messages = await SmsReaderService.readInbox({ minDate });

    const parsedIds = new Set(AppStorage.getParsedSMSIds());
    const existingTransactions = AppStorage.getTransactions();
    const { storeRawSmsBody } = AppStorage.getSettings();

    const outcome = await TransactionImportService.importMessages(messages, existingTransactions, parsedIds, onProgress, { storeRawSmsBody });
    persistImportOutcome(outcome, existingTransactions, parsedIds);

    AppStorage.saveLastSyncedAt(syncStartedAt);

    if (outcome.newTransactions.length > 0) {
      const allTransactions = [...outcome.newTransactions, ...existingTransactions];
      await NotificationOrchestrator.onTransactionsImported(outcome.newTransactions, allTransactions, AppStorage.getBudgets());
    }

    const settings = AppStorage.getSettings();
    AppStorage.saveSettings({ ...settings, smsPermissionGranted: true });

    return {
      added: outcome.newTransactions.length,
      total: existingTransactions.length + outcome.newTransactions.length,
      scanned: messages.length,
      skippedDuplicates: outcome.skippedDuplicates,
      skippedFiltered: outcome.skippedFiltered,
      failed: outcome.failed
    };
  }
};
