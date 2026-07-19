import { computeFinancialHealthScore } from '../../src/utils/financialHealth';
import { Transaction, Budget } from '../../src/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    amount: 100,
    currency: 'INR',
    merchant: 'Test',
    bank: 'HDFC',
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

const NOW = new Date('2026-07-15T12:00:00');

describe('computeFinancialHealthScore', () => {
  it('returns a zero score with no factors when there is no data at all', () => {
    const result = computeFinancialHealthScore([], [], NOW);
    expect(result.score).toBe(0);
    expect(result.factors).toEqual([]);
    expect(result.band).toBe('Critical');
  });

  it('scores a full savings-rate factor when nothing was spent', () => {
    const result = computeFinancialHealthScore(
      [tx({ id: 'income', type: 'income', category: 'Salary', amount: 50000, date: '2026-07-01' })],
      [],
      NOW
    );

    const savings = result.factors.find((f) => f.key === 'savings');
    expect(savings).toBeDefined();
    expect(savings!.score).toBe(100);
  });

  it('scores zero savings when expenses equal or exceed income', () => {
    const result = computeFinancialHealthScore(
      [
        tx({ id: 'income', type: 'income', category: 'Salary', amount: 10000, date: '2026-07-01' }),
        tx({ id: 'expense', type: 'expense', amount: 12000, date: '2026-07-05' })
      ],
      [],
      NOW
    );

    const savings = result.factors.find((f) => f.key === 'savings');
    expect(savings!.score).toBe(0);
  });

  it('only includes budget adherence when at least one budget has a real limit', () => {
    const budgets: Budget[] = [{ category: 'Food', limit: 0, spent: 0 }];
    const result = computeFinancialHealthScore([tx({ type: 'income', amount: 1000 })], budgets, NOW);
    expect(result.factors.find((f) => f.key === 'budget')).toBeUndefined();
  });

  it('scores full budget adherence when every budgeted category is within its limit', () => {
    const budgets: Budget[] = [{ category: 'Food', limit: 5000, spent: 0 }];
    const result = computeFinancialHealthScore(
      [tx({ category: 'Food', amount: 2000, date: '2026-07-05' }), tx({ type: 'income', amount: 20000 })],
      budgets,
      NOW
    );

    const budgetFactor = result.factors.find((f) => f.key === 'budget');
    expect(budgetFactor!.score).toBe(100);
  });

  it('omits consistency factors when there is only one month of history', () => {
    const result = computeFinancialHealthScore([tx({ date: '2026-07-05', amount: 500 })], [], NOW);
    expect(result.factors.find((f) => f.key === 'consistency')).toBeUndefined();
    expect(result.factors.find((f) => f.key === 'income-stability')).toBeUndefined();
  });

  it('scores high spending consistency when monthly totals are steady', () => {
    const result = computeFinancialHealthScore(
      [
        tx({ id: 'a', date: '2026-05-05', amount: 1000 }),
        tx({ id: 'b', date: '2026-06-05', amount: 1000 }),
        tx({ id: 'c', date: '2026-07-05', amount: 1000 }),
        tx({ id: 'income', type: 'income', amount: 5000, date: '2026-07-01' })
      ],
      [],
      NOW
    );

    const consistency = result.factors.find((f) => f.key === 'consistency');
    expect(consistency!.score).toBeGreaterThan(90);
  });

  it('penalizes a high fixed-obligations ratio', () => {
    const result = computeFinancialHealthScore(
      [
        tx({ id: 'income', type: 'income', amount: 10000, date: '2026-07-01' }),
        tx({ id: 'emi', category: 'EMI', amount: 6000, date: '2026-07-05' })
      ],
      [],
      NOW
    );

    const obligations = result.factors.find((f) => f.key === 'obligations');
    expect(obligations!.score).toBeLessThan(50);
  });

  it('produces a 6-entry trend, one per recent month', () => {
    const result = computeFinancialHealthScore([tx({ date: '2026-07-05', amount: 500 })], [], NOW);
    expect(result.trend).toHaveLength(6);
    expect(result.trend[result.trend.length - 1].month).toBe('2026-07');
  });
});
