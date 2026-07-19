import { computeMerchantSummaries } from '../../src/utils/merchantInsights';
import { Transaction } from '../../src/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    amount: 100,
    currency: 'INR',
    merchant: 'Swiggy',
    bank: 'HDFC',
    date: '2026-07-05',
    type: 'expense',
    status: 'success',
    paymentMethod: 'UPI',
    category: 'Food',
    confidenceScore: 0.9,
    ...overrides
  };
}

describe('computeMerchantSummaries', () => {
  it('aggregates spend, visit count, and average per merchant', () => {
    const result = computeMerchantSummaries([
      tx({ id: 'a', amount: 300, date: '2026-07-01' }),
      tx({ id: 'b', amount: 500, date: '2026-07-10' })
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].totalSpend).toBe(800);
    expect(result[0].visitCount).toBe(2);
    expect(result[0].averageSpend).toBe(400);
    expect(result[0].highestBill).toBe(500);
  });

  it('ignores income transactions', () => {
    const result = computeMerchantSummaries([tx({ type: 'income', amount: 5000 })]);
    expect(result).toHaveLength(0);
  });

  it('tracks the most recent date per merchant', () => {
    const result = computeMerchantSummaries([tx({ id: 'a', date: '2026-07-01' }), tx({ id: 'b', date: '2026-07-20' })]);
    expect(result[0].lastDate).toBe('2026-07-20');
  });

  it('splits weekend vs weekday spend (2026-07-04 is a Saturday, 2026-07-15 a Wednesday)', () => {
    const result = computeMerchantSummaries([
      tx({ id: 'a', date: '2026-07-04', amount: 500 }),
      tx({ id: 'b', date: '2026-07-15', amount: 200 })
    ]);
    expect(result[0].weekendSpend).toBe(500);
    expect(result[0].weekdaySpend).toBe(200);
  });

  it('sorts merchants by total spend, highest first', () => {
    const result = computeMerchantSummaries([
      tx({ id: 'a', merchant: 'Amazon', amount: 1000 }),
      tx({ id: 'b', merchant: 'Swiggy', amount: 200 })
    ]);
    expect(result[0].merchant).toBe('Amazon');
  });

  it('keeps different merchants separate', () => {
    const result = computeMerchantSummaries([tx({ id: 'a', merchant: 'Amazon' }), tx({ id: 'b', merchant: 'Swiggy' })]);
    expect(result).toHaveLength(2);
  });
});
