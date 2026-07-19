import { detectRecurringPayments } from '../../src/utils/recurringPayments';
import { Transaction } from '../../src/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    amount: 15000,
    currency: 'INR',
    merchant: 'Landlord',
    bank: 'HDFC',
    date: '2026-06-01',
    type: 'expense',
    status: 'success',
    paymentMethod: 'Bank Transfer',
    category: 'Rent',
    confidenceScore: 0.9,
    ...overrides
  };
}

describe('detectRecurringPayments', () => {
  it('detects a bill paid ~monthly to the same merchant', () => {
    const transactions = [tx({ id: 'a', date: '2026-05-01' }), tx({ id: 'b', date: '2026-06-01' }), tx({ id: 'c', date: '2026-07-01' })];
    const result = detectRecurringPayments(transactions);

    expect(result).toHaveLength(1);
    expect(result[0].merchant).toBe('Landlord');
    expect(result[0].category).toBe('Rent');
    expect(result[0].occurrences).toBe(3);
    expect(result[0].nextDueDate).toBe('2026-07-31');
  });

  it('ignores categories that are not recurring-bill-like', () => {
    const transactions = [tx({ id: 'a', date: '2026-06-01', category: 'Food' }), tx({ id: 'b', date: '2026-07-01', category: 'Food' })];
    expect(detectRecurringPayments(transactions)).toHaveLength(0);
  });

  it('requires at least two occurrences', () => {
    expect(detectRecurringPayments([tx({ id: 'a', date: '2026-06-01' })])).toHaveLength(0);
  });

  it('ignores an interval too short to be monthly', () => {
    const transactions = [tx({ id: 'a', date: '2026-07-01' }), tx({ id: 'b', date: '2026-07-06' })];
    expect(detectRecurringPayments(transactions)).toHaveLength(0);
  });

  it('keeps different merchants in the same category separate', () => {
    const transactions = [
      tx({ id: 'a', date: '2026-06-01', merchant: 'Landlord' }),
      tx({ id: 'b', date: '2026-07-01', merchant: 'Landlord' }),
      tx({ id: 'c', date: '2026-06-05', merchant: 'HDFC Ergo', category: 'Insurance', amount: 2000 }),
      tx({ id: 'd', date: '2026-07-05', merchant: 'HDFC Ergo', category: 'Insurance', amount: 2000 })
    ];
    expect(detectRecurringPayments(transactions)).toHaveLength(2);
  });

  it('computes the average amount and an estimated yearly cost', () => {
    const transactions = [
      tx({ id: 'a', date: '2026-05-01', amount: 649 }),
      tx({ id: 'b', date: '2026-06-01', amount: 649 }),
      tx({ id: 'c', date: '2026-07-01', amount: 649 }, )
    ].map((t) => ({ ...t, category: 'Subscription', merchant: 'Netflix' }));

    const result = detectRecurringPayments(transactions);
    expect(result[0].averageAmount).toBe(649);
    expect(result[0].yearlyCost).toBeGreaterThan(649 * 11);
    expect(result[0].yearlyCost).toBeLessThan(649 * 13);
  });

  it('sorts results by next due date, soonest first', () => {
    const transactions = [
      // Rent due sooner
      tx({ id: 'r1', date: '2026-05-01', merchant: 'Landlord', category: 'Rent' }),
      tx({ id: 'r2', date: '2026-06-01', merchant: 'Landlord', category: 'Rent' }),
      // Insurance last paid later -> due later
      tx({ id: 'i1', date: '2026-05-20', merchant: 'HDFC Ergo', category: 'Insurance', amount: 2000 }),
      tx({ id: 'i2', date: '2026-06-20', merchant: 'HDFC Ergo', category: 'Insurance', amount: 2000 })
    ];

    const result = detectRecurringPayments(transactions);
    expect(result[0].merchant).toBe('Landlord');
    expect(result[1].merchant).toBe('HDFC Ergo');
  });
});
