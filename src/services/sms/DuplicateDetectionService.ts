import { Transaction } from '../../types';

type DedupFields = Pick<Transaction, 'amount' | 'bank' | 'referenceNumber' | 'date' | 'time' | 'accountLast4'>;

/**
 * The primary duplicate guard is the SMS message ID cache (see
 * TransactionImportService), which is cheap and exact. This is a second,
 * content-based guard for the case where the *same* real-world transaction
 * arrives as two distinct messages (e.g. both the bank's own SMS and a UPI
 * app's confirmation SMS for one payment).
 */
function buildKey(tx: DedupFields): string {
  return [tx.amount, tx.bank, tx.referenceNumber ?? '', tx.date, tx.time ?? '', tx.accountLast4 ?? ''].join('|');
}

export const DuplicateDetectionService = {
  isDuplicate(candidate: DedupFields, existing: DedupFields[]): boolean {
    const key = buildKey(candidate);
    return existing.some((tx) => buildKey(tx) === key);
  }
};
