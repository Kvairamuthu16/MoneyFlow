import { Transaction } from '../../types';
import { getAccountKey } from '../accountLabel';

type DedupFields = Pick<Transaction, 'amount' | 'bank' | 'referenceNumber' | 'date' | 'time' | 'accountLast4' | 'sourceText'>;

/**
 * The primary duplicate guard is the SMS message ID cache (see
 * TransactionImportService), which is cheap and exact. This is a second,
 * content-based guard for two cases the ID cache can't catch:
 *  - the *same* real-world transaction arriving as two distinct messages
 *    (e.g. both the bank's own SMS and a UPI app's confirmation SMS), caught
 *    by the compound field key below. The account is compared via
 *    getAccountKey (bank + last 3 digits), not the raw accountLast4 string,
 *    because the two messages can mask a different number of trailing
 *    digits for the very same account (e.g. "A/C *9892" vs "a/c XX892");
 *  - the exact same SMS being delivered twice under two different message
 *    IDs (dual-SIM duplicate delivery, a bank resending), caught by the raw
 *    text hash when both messages' text was retained.
 */
function buildKey(tx: DedupFields): string {
  return [tx.amount, getAccountKey(tx.bank, tx.accountLast4), tx.referenceNumber ?? '', tx.date, tx.time ?? ''].join('|');
}

/** Cheap non-cryptographic hash (djb2-ish) -- only used to short-circuit an exact-text comparison, not for security. */
function hashText(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33 + text.charCodeAt(i)) | 0;
  }
  return hash;
}

export const DuplicateDetectionService = {
  isDuplicate(candidate: DedupFields, existing: DedupFields[]): boolean {
    const key = buildKey(candidate);
    const candidateHash = candidate.sourceText ? hashText(candidate.sourceText) : undefined;

    return existing.some((tx) => {
      if (buildKey(tx) === key) return true;
      if (candidateHash !== undefined && tx.sourceText && hashText(tx.sourceText) === candidateHash) return true;
      return false;
    });
  }
};
