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
});
