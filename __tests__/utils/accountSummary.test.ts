import { computeAccountSummaries } from '../../src/utils/accountSummary';
import { Transaction } from '../../src/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    amount: 100,
    currency: 'INR',
    merchant: 'Test',
    bank: 'HDFC',
    accountLast4: '9892',
    date: '2026-07-05',
    time: '10:00',
    type: 'expense',
    status: 'success',
    paymentMethod: 'UPI',
    category: 'Food',
    confidenceScore: 0.9,
    ...overrides
  };
}

describe('computeAccountSummaries', () => {
  it('segregates transactions by (bank, account) pair', () => {
    const summaries = computeAccountSummaries(
      [
        tx({ id: 'a', bank: 'HDFC', accountLast4: '9892' }),
        tx({ id: 'b', bank: 'ICICI', accountLast4: '4433' })
      ],
      '2026-07'
    );

    expect(summaries).toHaveLength(2);
    expect(summaries.map((s) => s.label).sort()).toEqual(['HDFC ••9892', 'ICICI ••4433']);
  });

  it('treats two accounts at the same bank as distinct', () => {
    const summaries = computeAccountSummaries(
      [
        tx({ id: 'a', bank: 'HDFC', accountLast4: '9892' }),
        tx({ id: 'b', bank: 'HDFC', accountLast4: '1234' })
      ],
      '2026-07'
    );

    expect(summaries).toHaveLength(2);
  });

  it('reports the chronologically latest balance, not the last one in input order', () => {
    const summaries = computeAccountSummaries(
      [
        tx({ id: 'newer', date: '2026-07-10', time: '09:00', balanceAfter: 5000 }),
        tx({ id: 'older', date: '2026-07-01', time: '09:00', balanceAfter: 9000 })
      ],
      '2026-07'
    );

    expect(summaries[0].latestBalance).toBe(5000);
    expect(summaries[0].lastActivityDate).toBe('2026-07-10');
  });

  it('leaves latestBalance undefined when no transaction ever reported one', () => {
    const summaries = computeAccountSummaries([tx({ balanceAfter: undefined })], '2026-07');
    expect(summaries[0].latestBalance).toBeUndefined();
  });

  it('only counts income/expense toward the requested month, but counts all transactions toward transactionCount', () => {
    const summaries = computeAccountSummaries(
      [
        tx({ id: 'this-month', date: '2026-07-05', type: 'expense', amount: 300 }),
        tx({ id: 'last-month', date: '2026-06-05', type: 'expense', amount: 900 })
      ],
      '2026-07'
    );

    expect(summaries[0].monthExpense).toBe(300);
    expect(summaries[0].transactionCount).toBe(2);
  });

  it('sums income and expense separately', () => {
    const summaries = computeAccountSummaries(
      [
        tx({ id: 'a', type: 'expense', amount: 300 }),
        tx({ id: 'b', type: 'income', amount: 5000 })
      ],
      '2026-07'
    );

    expect(summaries[0].monthExpense).toBe(300);
    expect(summaries[0].monthIncome).toBe(5000);
  });

  it('sorts accounts by transaction count, most active first', () => {
    const summaries = computeAccountSummaries(
      [
        tx({ id: 'a1', bank: 'HDFC', accountLast4: '1111' }),
        tx({ id: 'b1', bank: 'ICICI', accountLast4: '2222' }),
        tx({ id: 'b2', bank: 'ICICI', accountLast4: '2222' }),
        tx({ id: 'b3', bank: 'ICICI', accountLast4: '2222' })
      ],
      '2026-07'
    );

    expect(summaries[0].label).toBe('ICICI ••2222');
    expect(summaries[0].transactionCount).toBe(3);
  });
});
