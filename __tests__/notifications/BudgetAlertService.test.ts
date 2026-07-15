import { initializeStorage, AppStorage } from '../../src/storage/mmkv';
import { BudgetAlertService } from '../../src/services/notifications/BudgetAlertService';
import { NotificationService } from '../../src/services/notifications/NotificationService';
import { Budget, Transaction } from '../../src/types';

const currentYearMonth = new Date().toISOString().slice(0, 7);

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    amount: 100,
    currency: 'INR',
    merchant: 'Test Merchant',
    bank: 'HDFC',
    date: `${currentYearMonth}-05`,
    type: 'expense',
    status: 'success',
    paymentMethod: 'UPI',
    category: 'Food',
    confidenceScore: 0.9,
    ...overrides
  };
}

const budgets: Budget[] = [{ category: 'Food', limit: 1000, spent: 0 }];

describe('BudgetAlertService', () => {
  beforeEach(async () => {
    await initializeStorage();
    AppStorage.clearAll();
    jest.restoreAllMocks();
    jest.spyOn(NotificationService, 'displayNow').mockResolvedValue(undefined);
  });

  it('fires an 80% alert once spend crosses the threshold', async () => {
    await BudgetAlertService.checkAndNotify(budgets, [tx({ id: 'a', amount: 850, category: 'Food' })]);

    expect(NotificationService.displayNow).toHaveBeenCalledWith(expect.stringContaining('budget-Food'), expect.stringContaining('80%'), expect.any(String));
  });

  it('fires a 100% alert when the budget is exceeded', async () => {
    await BudgetAlertService.checkAndNotify(budgets, [tx({ id: 'a', amount: 1200, category: 'Food' })]);

    expect(NotificationService.displayNow).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('exceeded'), expect.any(String));
  });

  it('does not re-fire the same threshold alert on a subsequent check', async () => {
    await BudgetAlertService.checkAndNotify(budgets, [tx({ id: 'a', amount: 850, category: 'Food' })]);
    (NotificationService.displayNow as jest.Mock).mockClear();

    await BudgetAlertService.checkAndNotify(budgets, [tx({ id: 'a', amount: 850, category: 'Food' })]);

    expect(NotificationService.displayNow).not.toHaveBeenCalled();
  });

  it('fires both the 80% and 100% alerts as spend progresses through each threshold', async () => {
    await BudgetAlertService.checkAndNotify(budgets, [tx({ id: 'a', amount: 850, category: 'Food' })]);
    (NotificationService.displayNow as jest.Mock).mockClear();

    await BudgetAlertService.checkAndNotify(budgets, [tx({ id: 'a', amount: 850, category: 'Food' }), tx({ id: 'b', amount: 300, category: 'Food' })]);

    expect(NotificationService.displayNow).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('exceeded'), expect.any(String));
  });

  it('does not fire for a budget with no limit set', async () => {
    await BudgetAlertService.checkAndNotify([{ category: 'Food', limit: 0, spent: 0 }], [tx({ amount: 5000, category: 'Food' })]);
    expect(NotificationService.displayNow).not.toHaveBeenCalled();
  });

  it('ignores spend from a different month', async () => {
    await BudgetAlertService.checkAndNotify(budgets, [tx({ amount: 900, category: 'Food', date: '2020-01-05' })]);
    expect(NotificationService.displayNow).not.toHaveBeenCalled();
  });
});
