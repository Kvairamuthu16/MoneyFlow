import { computeContactSummaries, topPaidTo, topReceivedFrom } from '../../src/utils/contactInsights';
import { Transaction } from '../../src/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    amount: 500,
    currency: 'INR',
    merchant: 'Rahul',
    bank: 'HDFC',
    date: '2026-07-05',
    type: 'expense',
    status: 'success',
    paymentMethod: 'UPI',
    category: 'Transfer',
    confidenceScore: 0.9,
    ...overrides
  };
}

describe('computeContactSummaries', () => {
  it('excludes merchant transactions with no contact identifier at all', () => {
    const result = computeContactSummaries([tx({ contactName: undefined, mobileNumber: undefined, emailAddress: undefined, upiId: undefined })]);
    expect(result).toHaveLength(0);
  });

  it('aggregates sent and received amounts for the same contact', () => {
    const result = computeContactSummaries([
      tx({ id: 'a', type: 'expense', amount: 500, contactName: 'Rahul' }),
      tx({ id: 'b', type: 'income', amount: 200, contactName: 'Rahul' })
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].totalSent).toBe(500);
    expect(result[0].totalReceived).toBe(200);
    expect(result[0].netBalance).toBe(-300);
    expect(result[0].transactionCount).toBe(2);
  });

  it('falls back to mobile number, then email, then UPI ID when no contact name is known', () => {
    const byMobile = computeContactSummaries([tx({ contactName: undefined, mobileNumber: '9876543210' })]);
    expect(byMobile[0].key).toBe('9876543210');

    const byUpi = computeContactSummaries([tx({ contactName: undefined, mobileNumber: undefined, upiId: 'rahul@okhdfcbank' })]);
    expect(byUpi[0].key).toBe('rahul@okhdfcbank');
  });

  it('upgrades the display label once a contact name is resolved for a previously-unnamed identifier', () => {
    const result = computeContactSummaries([
      tx({ id: 'a', mobileNumber: '9876543210', contactName: undefined, date: '2026-07-01' }),
      tx({ id: 'b', mobileNumber: '9876543210', contactName: 'Rahul', date: '2026-07-10' })
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Rahul');
  });

  it('keeps different contacts separate', () => {
    const result = computeContactSummaries([tx({ id: 'a', contactName: 'Rahul' }), tx({ id: 'b', contactName: 'Priya' })]);
    expect(result).toHaveLength(2);
  });
});

describe('topPaidTo / topReceivedFrom', () => {
  it('ranks by amount and excludes contacts with none in that direction', () => {
    const summaries = computeContactSummaries([
      tx({ id: 'a', type: 'expense', amount: 1000, contactName: 'Landlord' }),
      tx({ id: 'b', type: 'expense', amount: 200, contactName: 'Rahul' }),
      tx({ id: 'c', type: 'income', amount: 5000, contactName: 'Employer' })
    ]);

    const paid = topPaidTo(summaries);
    expect(paid.map((s) => s.label)).toEqual(['Landlord', 'Rahul']);

    const received = topReceivedFrom(summaries);
    expect(received.map((s) => s.label)).toEqual(['Employer']);
  });

  it('respects the limit parameter', () => {
    const summaries = computeContactSummaries([
      tx({ id: 'a', contactName: 'A', amount: 100 }),
      tx({ id: 'b', contactName: 'B', amount: 200 }),
      tx({ id: 'c', contactName: 'C', amount: 300 })
    ]);

    expect(topPaidTo(summaries, 2)).toHaveLength(2);
  });
});
