import { computeAiInsights } from '../../src/utils/aiInsights';
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

function ids(insights: ReturnType<typeof computeAiInsights>): string[] {
  return insights.map((i) => i.id);
}

describe('computeAiInsights', () => {
  it('flags a budget alert when monthly expenses exceed income', () => {
    const monthly = [tx({ type: 'income', amount: 1000 }), tx({ type: 'expense', amount: 2000 })];
    const insights = computeAiInsights(monthly, monthly, [], '2026-07', 'INR');
    expect(ids(insights)).toContain('budget-alert');
  });

  it('flags categories that are over budget', () => {
    const budgets: Budget[] = [{ category: 'Food', limit: 1000, spent: 1500 }];
    const insights = computeAiInsights([], [], budgets, '2026-07', 'INR');
    const overBudget = insights.find((i) => i.id === 'over-budget');
    expect(overBudget).toBeDefined();
    expect(overBudget!.description).toContain('Food');
  });

  it('flags an upward spending trend vs the previous month', () => {
    const transactions = [
      tx({ id: 'june', date: '2026-06-10', amount: 1000 }),
      tx({ id: 'july', date: '2026-07-10', amount: 1500 })
    ];
    const monthly = [transactions[1]];
    const insights = computeAiInsights(transactions, monthly, [], '2026-07', 'INR');
    expect(ids(insights)).toContain('spending-trend-up');
    expect(ids(insights)).not.toContain('spending-trend-down');
  });

  it('flags a downward spending trend vs the previous month', () => {
    const transactions = [
      tx({ id: 'june', date: '2026-06-10', amount: 1000 }),
      tx({ id: 'july', date: '2026-07-10', amount: 400 })
    ];
    const monthly = [transactions[1]];
    const insights = computeAiInsights(transactions, monthly, [], '2026-07', 'INR');
    expect(ids(insights)).toContain('spending-trend-down');
  });

  it('does not flag a spending trend when the change is small', () => {
    const transactions = [
      tx({ id: 'june', date: '2026-06-10', amount: 1000 }),
      tx({ id: 'july', date: '2026-07-10', amount: 1050 })
    ];
    const monthly = [transactions[1]];
    const insights = computeAiInsights(transactions, monthly, [], '2026-07', 'INR');
    expect(ids(insights)).not.toContain('spending-trend-up');
  });

  it('flags unusually high weekend spending', () => {
    // July 4/5 and 11/12 2026 are weekend dates; July 15 is a Wednesday.
    const monthly = [
      tx({ id: 'w1', date: '2026-07-04', amount: 3000 }),
      tx({ id: 'w2', date: '2026-07-05', amount: 3000 }),
      tx({ id: 'd1', date: '2026-07-15', amount: 200 }),
      tx({ id: 'd2', date: '2026-07-16', amount: 200 })
    ];
    const insights = computeAiInsights(monthly, monthly, [], '2026-07', 'INR');
    expect(ids(insights)).toContain('weekend-overspend');
  });

  it('does not flag weekend spending when weekday and weekend averages are close', () => {
    const monthly = [
      tx({ id: 'w1', date: '2026-07-04', amount: 200 }),
      tx({ id: 'w2', date: '2026-07-05', amount: 200 }),
      tx({ id: 'd1', date: '2026-07-15', amount: 210 }),
      tx({ id: 'd2', date: '2026-07-16', amount: 190 })
    ];
    const insights = computeAiInsights(monthly, monthly, [], '2026-07', 'INR');
    expect(ids(insights)).not.toContain('weekend-overspend');
  });

  it('flags a discretionary category that is well above its trailing average, with a currency-formatted savings estimate', () => {
    const transactions = [
      tx({ id: 'apr', date: '2026-04-10', category: 'Food', amount: 2000 }),
      tx({ id: 'may', date: '2026-05-10', category: 'Food', amount: 2000 }),
      tx({ id: 'jun', date: '2026-06-10', category: 'Food', amount: 2000 }),
      tx({ id: 'jul', date: '2026-07-10', category: 'Food', amount: 5000 })
    ];
    const monthly = [transactions[3]];
    const insights = computeAiInsights(transactions, monthly, [], '2026-07', 'INR');
    const outlier = insights.find((i) => i.id === 'category-outlier');
    expect(outlier).toBeDefined();
    expect(outlier!.title).toContain('Food');
    expect(outlier!.description).toContain('₹');
  });

  it('flags a merchant order-frequency spike vs last month', () => {
    const transactions = [
      tx({ id: 'j1', date: '2026-06-05', merchant: 'Swiggy', amount: 300 }),
      tx({ id: 'j2', date: '2026-07-02', merchant: 'Swiggy', amount: 300 }),
      tx({ id: 'j3', date: '2026-07-05', merchant: 'Swiggy', amount: 300 }),
      tx({ id: 'j4', date: '2026-07-10', merchant: 'Swiggy', amount: 300 })
    ];
    const monthly = transactions.filter((t) => t.date.startsWith('2026-07'));
    const insights = computeAiInsights(transactions, monthly, [], '2026-07', 'INR');
    const spike = insights.find((i) => i.id === 'merchant-spike');
    expect(spike).toBeDefined();
    expect(spike!.title).toContain('Swiggy');
  });

  it('predicts an upcoming salary credit when there is a clear ~monthly pattern', () => {
    const transactions = [
      tx({ id: 's1', type: 'income', category: 'Salary', date: '2026-05-01', amount: 50000 }),
      tx({ id: 's2', type: 'income', category: 'Salary', date: '2026-06-01', amount: 50000 }),
      tx({ id: 's3', type: 'income', category: 'Salary', date: '2026-07-01', amount: 50000 })
    ];
    const now = new Date('2026-07-30T09:00:00');
    const insights = computeAiInsights(transactions, [], [], '2026-07', 'INR', now);
    expect(insights.some((i) => i.id === 'salary-expected')).toBe(true);
  });

  it('does not predict a salary credit far from the expected date', () => {
    const transactions = [
      tx({ id: 's1', type: 'income', category: 'Salary', date: '2026-05-01', amount: 50000 }),
      tx({ id: 's2', type: 'income', category: 'Salary', date: '2026-06-01', amount: 50000 }),
      tx({ id: 's3', type: 'income', category: 'Salary', date: '2026-07-01', amount: 50000 })
    ];
    const now = new Date('2026-07-10T09:00:00');
    const insights = computeAiInsights(transactions, [], [], '2026-07', 'INR', now);
    expect(insights.some((i) => i.id === 'salary-expected')).toBe(false);
  });
});
