import { BillReminderService } from '../../src/services/notifications/BillReminderService';
import { NotificationService } from '../../src/services/notifications/NotificationService';
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

describe('BillReminderService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(NotificationService, 'scheduleAt').mockResolvedValue(undefined);
  });

  it('schedules a reminder for a bill paid ~monthly to the same merchant', async () => {
    const now = new Date('2026-07-27T00:00:00Z');
    const transactions = [tx({ id: 'a', date: '2026-06-01' }), tx({ id: 'b', date: '2026-07-01' })];

    await BillReminderService.scheduleUpcomingReminders(transactions, now);

    expect(NotificationService.scheduleAt).toHaveBeenCalledWith(
      expect.stringContaining('bill-rent-landlord'),
      expect.stringContaining('Landlord'),
      expect.any(String),
      expect.any(Number)
    );
  });

  it('does not schedule for a category that is not recurring-bill-like', async () => {
    const now = new Date('2026-07-28T00:00:00Z');
    const transactions = [tx({ id: 'a', date: '2026-06-01', category: 'Food' }), tx({ id: 'b', date: '2026-07-01', category: 'Food' })];

    await BillReminderService.scheduleUpcomingReminders(transactions, now);

    expect(NotificationService.scheduleAt).not.toHaveBeenCalled();
  });

  it('does not schedule with only a single occurrence', async () => {
    await BillReminderService.scheduleUpcomingReminders([tx({ id: 'a', date: '2026-06-01' })], new Date('2026-07-28T00:00:00Z'));
    expect(NotificationService.scheduleAt).not.toHaveBeenCalled();
  });

  it('does not schedule when the interval is too short to be monthly', async () => {
    const transactions = [tx({ id: 'a', date: '2026-07-01' }), tx({ id: 'b', date: '2026-07-06' })];
    await BillReminderService.scheduleUpcomingReminders(transactions, new Date('2026-07-28T00:00:00Z'));
    expect(NotificationService.scheduleAt).not.toHaveBeenCalled();
  });

  it('does not schedule when the predicted due date has already passed', async () => {
    // Last payment was 01-Jun, next due ~01-Jul -- "now" is well past that.
    const transactions = [tx({ id: 'a', date: '2026-05-02' }), tx({ id: 'b', date: '2026-06-01' })];
    await BillReminderService.scheduleUpcomingReminders(transactions, new Date('2026-07-20T00:00:00Z'));
    expect(NotificationService.scheduleAt).not.toHaveBeenCalled();
  });

  it('keeps bills for different merchants in the same category separate', async () => {
    const transactions = [
      tx({ id: 'a', date: '2026-06-01', merchant: 'Landlord' }),
      tx({ id: 'b', date: '2026-07-01', merchant: 'Landlord' }),
      tx({ id: 'c', date: '2026-06-05', merchant: 'HDFC Ergo', category: 'Insurance' }),
      tx({ id: 'd', date: '2026-07-05', merchant: 'HDFC Ergo', category: 'Insurance' })
    ];

    await BillReminderService.scheduleUpcomingReminders(transactions, new Date('2026-07-27T00:00:00Z'));

    expect(NotificationService.scheduleAt).toHaveBeenCalledTimes(2);
  });
});
