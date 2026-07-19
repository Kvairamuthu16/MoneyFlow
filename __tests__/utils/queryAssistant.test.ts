import { answerQuery } from '../../src/utils/queryAssistant';
import { Transaction } from '../../src/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    amount: 100,
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

describe('answerQuery', () => {
  it('prompts for a question when asked nothing', () => {
    const result = answerQuery('  ', [], 'INR', '2026-07');
    expect(result.answer).toContain('Ask me something');
  });

  it('lists failed transactions when present', () => {
    const transactions = [tx({ id: 'a', status: 'failed' }), tx({ id: 'b', status: 'success' })];
    const result = answerQuery('Show all failed transactions', transactions, 'INR', '2026-07');
    expect(result.answer).toContain('1 failed transaction');
    expect(result.transactions).toHaveLength(1);
  });

  it('reports no failed transactions when none exist', () => {
    const result = answerQuery('Show failed payments', [tx({ status: 'success' })], 'INR', '2026-07');
    expect(result.answer).toContain('No failed transactions');
  });

  it('lists detected subscriptions', () => {
    const transactions = [
      tx({ id: 'a', date: '2026-05-01', category: 'Subscription', merchant: 'Netflix', amount: 649 }),
      tx({ id: 'b', date: '2026-06-01', category: 'Subscription', merchant: 'Netflix', amount: 649 }),
      tx({ id: 'c', date: '2026-07-01', category: 'Subscription', merchant: 'Netflix', amount: 649 })
    ];
    const result = answerQuery('Show subscriptions', transactions, 'INR', '2026-07');
    expect(result.answer).toContain('Netflix');
  });

  it('identifies who paid the most', () => {
    const transactions = [
      tx({ id: 'a', type: 'income', amount: 5000, contactName: 'Employer' }),
      tx({ id: 'b', type: 'income', amount: 500, contactName: 'Rahul' })
    ];
    const result = answerQuery('Who paid me the most?', transactions, 'INR', '2026-07');
    expect(result.answer).toContain('Employer');
  });

  it('compares this month with last month', () => {
    const transactions = [tx({ id: 'a', date: '2026-06-10', amount: 1000 }), tx({ id: 'b', date: '2026-07-10', amount: 1500 })];
    const result = answerQuery('Compare this month with last month', transactions, 'INR', '2026-07');
    expect(result.answer).toContain('more');
  });

  it('explains why expenses are increasing, naming the biggest driver category', () => {
    const transactions = [
      tx({ id: 'a', date: '2026-06-05', category: 'Food', amount: 2000 }),
      tx({ id: 'b', date: '2026-07-05', category: 'Food', amount: 6000 }),
      tx({ id: 'c', date: '2026-06-05', category: 'Fuel', amount: 1000 }),
      tx({ id: 'd', date: '2026-07-05', category: 'Fuel', amount: 1100 })
    ];
    const result = answerQuery('Why are my expenses increasing?', transactions, 'INR', '2026-07');
    expect(result.answer).toContain('Food');
  });

  it('estimates how much can safely be saved this month', () => {
    const transactions = [tx({ id: 'a', type: 'income', amount: 50000, date: '2026-07-01' }), tx({ id: 'b', amount: 20000, date: '2026-07-05' })];
    const result = answerQuery('How much money can I safely save this month?', transactions, 'INR', '2026-07');
    expect(result.answer).toContain('30,000');
  });

  it('finds UPI payments above a given amount', () => {
    const transactions = [
      tx({ id: 'a', paymentMethod: 'UPI', amount: 6000 }),
      tx({ id: 'b', paymentMethod: 'UPI', amount: 200 }),
      tx({ id: 'c', paymentMethod: 'Cash', amount: 9000 })
    ];
    const result = answerQuery('Show UPI payments above 5000', transactions, 'INR', '2026-07');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions![0].id).toBe('a');
  });

  it('lists payments made to a specific person', () => {
    const transactions = [
      tx({ id: 'a', type: 'expense', amount: 1000, contactName: 'Rahul' }),
      tx({ id: 'b', type: 'expense', amount: 500, contactName: 'Rahul' }),
      tx({ id: 'c', type: 'expense', amount: 2000, contactName: 'Priya' })
    ];
    const result = answerQuery('Show all payments to Rahul', transactions, 'INR', '2026-07');
    expect(result.transactions).toHaveLength(2);
    expect(result.answer).toContain('Rahul');
  });

  it('reports when no matching contact is found', () => {
    const result = answerQuery('Show payments to Nobody', [tx({ contactName: 'Rahul' })], 'INR', '2026-07');
    expect(result.answer).toContain("couldn't find");
  });

  it('answers merchant-specific spend queries', () => {
    const transactions = [tx({ id: 'a', merchant: 'Amazon', amount: 1200 }), tx({ id: 'b', merchant: 'Amazon', amount: 800 })];
    const result = answerQuery('How much did I spend on Amazon?', transactions, 'INR', '2026-07');
    expect(result.answer).toContain('Amazon');
    expect(result.answer).toContain('2,000');
  });

  it('falls back to category totals when the phrase does not match a known merchant', () => {
    const transactions = [tx({ id: 'a', category: 'Fuel', amount: 2000, merchant: 'HP Petrol Pump' })];
    const result = answerQuery('How much did I spend on fuel?', transactions, 'INR', '2026-07');
    expect(result.answer).toContain('fuel');
  });

  it('gives an honest fallback for unrecognized queries', () => {
    const result = answerQuery('What is the meaning of life?', [], 'INR', '2026-07');
    expect(result.answer).toContain("couldn't find an answer");
  });
});
