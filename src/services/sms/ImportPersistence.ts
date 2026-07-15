import { AppStorage } from '../../storage/mmkv';
import { Transaction } from '../../types';
import { ImportOutcome } from './TransactionImportService';

/**
 * Shared "write the pipeline's output to disk" step, used by both the
 * manual/pull-to-refresh sync (SmsSyncWorker) and the real-time background
 * listener (backgroundSmsTask) -- both run the same import pipeline, they
 * just differ in how they got their RawSmsMessage(s) in the first place.
 */
export function persistImportOutcome(outcome: ImportOutcome, existingTransactions: Transaction[], parsedIds: ReadonlySet<string>): void {
  if (outcome.newTransactions.length > 0) {
    AppStorage.saveTransactions([...outcome.newTransactions, ...existingTransactions]);
  }
  if (outcome.newlyParsedIds.length > 0) {
    AppStorage.saveParsedSMSIds([...parsedIds, ...outcome.newlyParsedIds]);
  }
}
