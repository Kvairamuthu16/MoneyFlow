import { Transaction } from '../../types';
import { AppStorage } from '../../storage/mmkv';
import { formatCurrency } from '../../utils/currency';
import { NotificationService } from './NotificationService';

/** Fires a "salary credited" notification for each newly-imported Salary-category income transaction. */
export const SalaryNotificationService = {
  async notifyNewCredits(newTransactions: Transaction[]): Promise<void> {
    const salaryCredits = newTransactions.filter((t) => t.type === 'income' && t.category === 'Salary');
    if (salaryCredits.length === 0) return;

    const { currency } = AppStorage.getSettings();
    for (const tx of salaryCredits) {
      await NotificationService.displayNow(
        `salary-${tx.id}`,
        'Salary credited',
        `${formatCurrency(tx.amount, currency)} credited to your ${tx.bank} account.`
      );
    }
  }
};
