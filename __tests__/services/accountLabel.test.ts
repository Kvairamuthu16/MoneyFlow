import { getAccountLabel, isSameAccount, collectDistinctAccounts } from '../../src/services/accountLabel';

describe('getAccountLabel', () => {
  it('includes the masked digits when present', () => {
    expect(getAccountLabel('HDFC', '9892')).toBe('HDFC ••9892');
  });

  it('falls back to just the bank name when no digits are known', () => {
    expect(getAccountLabel('HDFC', undefined)).toBe('HDFC');
  });
});

describe('isSameAccount', () => {
  it('treats a 4-digit mask and a 3-digit mask as the same account when one is a suffix of the other', () => {
    expect(isSameAccount('HDFC', '9892', 'HDFC', '892')).toBe(true);
  });

  it('is case- and whitespace-insensitive on the bank name', () => {
    expect(isSameAccount('HDFC', '9892', ' hdfc ', '9892')).toBe(true);
  });

  it('treats two different accounts at the same bank as different, even sharing digits', () => {
    expect(isSameAccount('HDFC', '9892', 'HDFC', '4433')).toBe(false);
  });

  // Regression: earlier this was normalized by blindly truncating both
  // sides to their last 3 digits, which meant two real, distinct accounts
  // ending in the same 3 digits (e.g. "1234" and "5234", both ending "234")
  // were wrongly treated as one account.
  it('does NOT treat two different same-length accounts as the same just because they share a suffix', () => {
    expect(isSameAccount('HDFC', '1234', 'HDFC', '5234')).toBe(false);
  });

  it('treats the same account digits at two different banks as different', () => {
    expect(isSameAccount('HDFC', '9892', 'ICICI', '9892')).toBe(false);
  });

  it('treats two transactions with no known account digits at the same bank as the same "unknown account" bucket', () => {
    expect(isSameAccount('HDFC', undefined, 'HDFC', undefined)).toBe(true);
  });

  it('does not match when only one side has known digits', () => {
    expect(isSameAccount('HDFC', '9892', 'HDFC', undefined)).toBe(false);
  });
});

describe('collectDistinctAccounts', () => {
  it('collapses a 4-digit and 3-digit mask of the same account into one entry', () => {
    const result = collectDistinctAccounts([
      { bank: 'HDFC', accountLast4: '892' },
      { bank: 'HDFC', accountLast4: '9892' }
    ]);

    expect(result).toHaveLength(1);
  });

  it('labels the collapsed entry using the most specific (longest) digits seen', () => {
    const result = collectDistinctAccounts([
      { bank: 'HDFC', accountLast4: '892' },
      { bank: 'HDFC', accountLast4: '9892' }
    ]);

    expect(result[0].label).toBe('HDFC ••9892');
    expect(result[0].accountLast4).toBe('9892');
  });

  it('keeps the longest label even when the more specific digits appear first', () => {
    const result = collectDistinctAccounts([
      { bank: 'HDFC', accountLast4: '9892' },
      { bank: 'HDFC', accountLast4: '892' }
    ]);

    expect(result[0].label).toBe('HDFC ••9892');
  });

  it('keeps distinct accounts separate', () => {
    const result = collectDistinctAccounts([
      { bank: 'HDFC', accountLast4: '9892' },
      { bank: 'ICICI', accountLast4: '4433' }
    ]);

    expect(result).toHaveLength(2);
  });

  it('keeps two different same-length accounts at the same bank separate (regression)', () => {
    const result = collectDistinctAccounts([
      { bank: 'HDFC', accountLast4: '1234' },
      { bank: 'HDFC', accountLast4: '5234' }
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.label).sort()).toEqual(['HDFC ••1234', 'HDFC ••5234']);
  });
});
