import { initializeStorage, AppStorage } from '../../src/storage/mmkv';
import { NotificationOrchestrator } from '../../src/services/notifications/NotificationOrchestrator';
import { NotificationService } from '../../src/services/notifications/NotificationService';
import { SalaryNotificationService } from '../../src/services/notifications/SalaryNotificationService';
import { BudgetAlertService } from '../../src/services/notifications/BudgetAlertService';
import { BillReminderService } from '../../src/services/notifications/BillReminderService';
import { Transaction } from '../../src/types';

jest.mock('../../src/services/notifications/SalaryNotificationService');
jest.mock('../../src/services/notifications/BudgetAlertService');
jest.mock('../../src/services/notifications/BillReminderService');

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

describe('NotificationOrchestrator', () => {
  beforeEach(async () => {
    await initializeStorage();
    AppStorage.clearAll();
    jest.clearAllMocks();
    jest.spyOn(NotificationService, 'requestPermission').mockResolvedValue(true);
  });

  it('does nothing when there are no new transactions', async () => {
    AppStorage.saveSettings({ ...AppStorage.getSettings(), notificationsEnabled: true });

    await NotificationOrchestrator.onTransactionsImported([], [], []);

    expect(NotificationService.requestPermission).not.toHaveBeenCalled();
    expect(SalaryNotificationService.notifyNewCredits).not.toHaveBeenCalled();
  });

  it('does nothing when the user has not opted in via Settings', async () => {
    AppStorage.saveSettings({ ...AppStorage.getSettings(), notificationsEnabled: false });

    await NotificationOrchestrator.onTransactionsImported([tx({})], [tx({})], []);

    expect(NotificationService.requestPermission).not.toHaveBeenCalled();
    expect(BudgetAlertService.checkAndNotify).not.toHaveBeenCalled();
  });

  it('does nothing when the OS denies notification permission', async () => {
    AppStorage.saveSettings({ ...AppStorage.getSettings(), notificationsEnabled: true });
    (NotificationService.requestPermission as jest.Mock).mockResolvedValue(false);

    await NotificationOrchestrator.onTransactionsImported([tx({})], [tx({})], []);

    expect(SalaryNotificationService.notifyNewCredits).not.toHaveBeenCalled();
  });

  it('runs all three notification checks when enabled, granted, and there are new transactions', async () => {
    AppStorage.saveSettings({ ...AppStorage.getSettings(), notificationsEnabled: true });
    const newTx = [tx({})];
    const allTx = [tx({})];
    const budgets = [{ category: 'Food', limit: 1000, spent: 0 }];

    await NotificationOrchestrator.onTransactionsImported(newTx, allTx, budgets);

    expect(SalaryNotificationService.notifyNewCredits).toHaveBeenCalledWith(newTx);
    expect(BudgetAlertService.checkAndNotify).toHaveBeenCalledWith(budgets, allTx);
    expect(BillReminderService.scheduleUpcomingReminders).toHaveBeenCalledWith(allTx);
  });

  it('never throws even if a sub-service fails', async () => {
    AppStorage.saveSettings({ ...AppStorage.getSettings(), notificationsEnabled: true });
    (BudgetAlertService.checkAndNotify as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(NotificationOrchestrator.onTransactionsImported([tx({})], [tx({})], [])).resolves.toBeUndefined();
  });
});
