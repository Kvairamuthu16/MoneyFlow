import { DuplicateDetectionService } from '../../src/services/sms/DuplicateDetectionService';

const base = {
  amount: 500,
  bank: 'HDFC',
  referenceNumber: '123456789012',
  date: '2026-07-10',
  time: '14:30',
  accountLast4: '9892'
};

describe('DuplicateDetectionService', () => {
  it('flags an identical transaction as a duplicate', () => {
    expect(DuplicateDetectionService.isDuplicate(base, [{ ...base }])).toBe(true);
  });

  it('does not flag a transaction with a different reference number', () => {
    expect(DuplicateDetectionService.isDuplicate(base, [{ ...base, referenceNumber: '999999999999' }])).toBe(false);
  });

  it('does not flag a transaction on a different date', () => {
    expect(DuplicateDetectionService.isDuplicate(base, [{ ...base, date: '2026-07-11' }])).toBe(false);
  });

  it('does not flag a transaction from a different account at the same bank', () => {
    expect(DuplicateDetectionService.isDuplicate(base, [{ ...base, accountLast4: '4521' }])).toBe(false);
  });

  it('returns false against an empty history', () => {
    expect(DuplicateDetectionService.isDuplicate(base, [])).toBe(false);
  });

  it('flags an exact-text resend as a duplicate via the SMS hash, even with different compound-key fields', () => {
    const smsBody = 'Rs.500 debited from A/c XX9892 towards Amazon. Ref 123456789012';
    const original = { ...base, sourceText: smsBody };
    // Simulates a second delivery of the identical SMS under a different
    // message ID, where re-parsing happened to compute a different time.
    const resend = { ...base, time: '14:31', sourceText: smsBody };

    expect(DuplicateDetectionService.isDuplicate(resend, [original])).toBe(true);
  });

  it('does not flag two different transactions that merely lack sourceText', () => {
    const a = { ...base, referenceNumber: undefined };
    const b = { ...base, referenceNumber: undefined, date: '2026-07-11' };

    expect(DuplicateDetectionService.isDuplicate(a, [b])).toBe(false);
  });
});
