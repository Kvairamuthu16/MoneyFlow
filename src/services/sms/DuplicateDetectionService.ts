import { Transaction } from '../../types';
import { isSameAccount } from '../accountLabel';

type DedupFields = Pick<Transaction, 'amount' | 'bank' | 'referenceNumber' | 'date' | 'time' | 'accountLast4' | 'sourceText'>;

/**
 * The primary duplicate guard is the SMS message ID cache (see
 * TransactionImportService), which is cheap and exact. This is a second,
 * content-based guard for two cases the ID cache can't catch:
 *  - the *same* real-world transaction arriving as two distinct messages
 *    (e.g. both the bank's own SMS and a UPI app's confirmation SMS), caught
 *    by the compound field comparison below. The account is compared via
 *    isSameAccount, not raw string equality, because the two messages can
 *    mask a different number of trailing digits for the very same account
 *    (e.g. "A/C *9892" vs "a/c XX892") -- but two different accounts that
 *    merely share the same number of digits are never treated as one, so
 *    this can't wrongly drop a genuine transaction from a second account
 *    that happens to end in a similar-looking number;
 *  - the exact same SMS being delivered twice under two different message
 *    IDs (dual-SIM duplicate delivery, a bank resending), caught by the raw
 *    text hash when both messages' text was retained.
 */
function fieldsMatch(a: DedupFields, b: DedupFields): boolean {
  return (
    a.amount === b.amount &&
    isSameAccount(a.bank, a.accountLast4, b.bank, b.accountLast4) &&
    (a.referenceNumber ?? '') === (b.referenceNumber ?? '') &&
    a.date === b.date &&
    (a.time ?? '') === (b.time ?? '')
  );
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
    const candidateHash = candidate.sourceText ? hashText(candidate.sourceText) : undefined;

    return existing.some((tx) => {
      if (fieldsMatch(candidate, tx)) return true;
      if (candidateHash !== undefined && tx.sourceText && hashText(tx.sourceText) === candidateHash) return true;
      return false;
    });
  }
};
