import { getAccountLabel, getAccountKey, collectDistinctAccounts } from '../../src/services/accountLabel';

describe('getAccountLabel', () => {
  it('includes the masked digits when present', () => {
    expect(getAccountLabel('HDFC', '9892')).toBe('HDFC ••9892');
  });

  it('falls back to just the bank name when no digits are known', () => {
    expect(getAccountLabel('HDFC', undefined)).toBe('HDFC');
  });
});

describe('getAccountKey', () => {
  it('treats a 4-digit mask and a 3-digit mask of the same account as the same key', () => {
    expect(getAccountKey('HDFC', '9892')).toBe(getAccountKey('HDFC', '892'));
  });

  it('is case- and whitespace-insensitive on the bank name', () => {
    expect(getAccountKey('HDFC', '9892')).toBe(getAccountKey(' hdfc ', '9892'));
  });

  it('treats two different accounts at the same bank as different keys', () => {
    expect(getAccountKey('HDFC', '9892')).not.toBe(getAccountKey('HDFC', '4433'));
  });

  it('treats the same account digits at two different banks as different keys', () => {
    expect(getAccountKey('HDFC', '9892')).not.toBe(getAccountKey('ICICI', '9892'));
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
});
