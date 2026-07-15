import { initializeStorage, AppStorage } from '../../src/storage/mmkv';
import { SalaryNotificationService } from '../../src/services/notifications/SalaryNotificationService';
import { NotificationService } from '../../src/services/notifications/NotificationService';
import { Transaction } from '../../src/types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    amount: 50000,
    currency: 'INR',
    merchant: 'ACME Corp',
    bank: 'HDFC',
    date: '2026-07-01',
    type: 'income',
    status: 'success',
    paymentMethod: 'Bank Transfer',
    category: 'Salary',
    confidenceScore: 0.9,
    ...overrides
  };
}

describe('SalaryNotificationService', () => {
  beforeEach(async () => {
    await initializeStorage();
    AppStorage.clearAll();
    jest.restoreAllMocks();
    jest.spyOn(NotificationService, 'displayNow').mockResolvedValue(undefined);
  });

  it('notifies for a new salary credit', async () => {
    await SalaryNotificationService.notifyNewCredits([tx({ id: 'sal-1' })]);

    expect(NotificationService.displayNow).toHaveBeenCalledWith('salary-sal-1', 'Salary credited', expect.stringContaining('HDFC'));
  });

  it('does not notify for a non-salary income transaction', async () => {
    await SalaryNotificationService.notifyNewCredits([tx({ id: 'refund-1', category: 'Refund' })]);
    expect(NotificationService.displayNow).not.toHaveBeenCalled();
  });

  it('does not notify for a Salary-category expense', async () => {
    await SalaryNotificationService.notifyNewCredits([tx({ id: 'weird-1', type: 'expense' })]);
    expect(NotificationService.displayNow).not.toHaveBeenCalled();
  });

  it('notifies once per new salary transaction', async () => {
    await SalaryNotificationService.notifyNewCredits([tx({ id: 'sal-1' }), tx({ id: 'sal-2' })]);
    expect(NotificationService.displayNow).toHaveBeenCalledTimes(2);
  });
});
