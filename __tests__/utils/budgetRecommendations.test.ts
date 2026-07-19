import { computeRecommendedBudgets } from '../../src/utils/budgetRecommendations';
import { Transaction, Budget } from '../../src/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    amount: 2000,
    currency: 'INR',
    merchant: 'Test',
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

describe('computeRecommendedBudgets', () => {
  it('recommends a budget for a category with spend history but no existing budget', () => {
    const transactions = [
      tx({ id: 'apr', date: '2026-04-10', amount: 6000 }),
      tx({ id: 'may', date: '2026-05-10', amount: 7000 }),
      tx({ id: 'jun', date: '2026-06-10', amount: 6500 }),
      tx({ id: 'jul', date: '2026-07-10', amount: 10200 })
    ];

    const result = computeRecommendedBudgets(transactions, [], '2026-07');

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Food');
    expect(result[0].currentSpend).toBe(10200);
    expect(result[0].recommendedLimit).toBeLessThan(result[0].currentSpend);
    expect(result[0].potentialSavings).toBe(result[0].currentSpend - result[0].recommendedLimit);
  });

  it('never recommends for a category the user already budgeted', () => {
    const transactions = [
      tx({ id: 'may', date: '2026-05-10', amount: 6000 }),
      tx({ id: 'jun', date: '2026-06-10', amount: 6000 }),
      tx({ id: 'jul', date: '2026-07-10', amount: 10000 })
    ];
    const budgets: Budget[] = [{ category: 'Food', limit: 8000, spent: 10000 }];

    expect(computeRecommendedBudgets(transactions, budgets, '2026-07')).toHaveLength(0);
  });

  it('does not recommend when there is fewer than 2 prior months of history', () => {
    const transactions = [tx({ id: 'jun', date: '2026-06-10', amount: 5000 }), tx({ id: 'jul', date: '2026-07-10', amount: 9000 })];
    expect(computeRecommendedBudgets(transactions, [], '2026-07')).toHaveLength(0);
  });

  it('does not recommend when current spend is already at or below a sustainable level', () => {
    const transactions = [
      tx({ id: 'apr', date: '2026-04-10', amount: 6000 }),
      tx({ id: 'may', date: '2026-05-10', amount: 6000 }),
      tx({ id: 'jun', date: '2026-06-10', amount: 6000 }),
      tx({ id: 'jul', date: '2026-07-10', amount: 5900 })
    ];
    expect(computeRecommendedBudgets(transactions, [], '2026-07')).toHaveLength(0);
  });

  it('sorts recommendations by potential savings, highest first', () => {
    const transactions = [
      // Food: small overspend
      tx({ id: 'f1', date: '2026-04-10', category: 'Food', amount: 5000 }),
      tx({ id: 'f2', date: '2026-05-10', category: 'Food', amount: 5000 }),
      tx({ id: 'f3', date: '2026-06-10', category: 'Food', amount: 5000 }),
      tx({ id: 'f4', date: '2026-07-10', category: 'Food', amount: 5500 }),
      // Shopping: large overspend
      tx({ id: 's1', date: '2026-04-10', category: 'Shopping', amount: 2000 }),
      tx({ id: 's2', date: '2026-05-10', category: 'Shopping', amount: 2000 }),
      tx({ id: 's3', date: '2026-06-10', category: 'Shopping', amount: 2000 }),
      tx({ id: 's4', date: '2026-07-10', category: 'Shopping', amount: 8000 })
    ];

    const result = computeRecommendedBudgets(transactions, [], '2026-07');
    expect(result[0].category).toBe('Shopping');
  });
});
