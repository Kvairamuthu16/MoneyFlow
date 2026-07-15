import { Budget, Transaction } from '../../types';
import { AppStorage } from '../../storage/mmkv';
import { NotificationService } from './NotificationService';
import { BudgetAlertService } from './BudgetAlertService';
import { SalaryNotificationService } from './SalaryNotificationService';
import { BillReminderService } from './BillReminderService';

/**
 * Single entry point called after any import (manual sync or the real-time
 * background listener) that actually added new transactions. Skips
 * everything if the user hasn't opted in via Settings, or if the OS denies
 * the permission -- never blocks or throws into the caller's import flow.
 */
export const NotificationOrchestrator = {
  async onTransactionsImported(newTransactions: Transaction[], allTransactions: Transaction[], budgetConfigs: Budget[]): Promise<void> {
    if (newTransactions.length === 0) return;

    const { notificationsEnabled } = AppStorage.getSettings();
    if (!notificationsEnabled) return;

    try {
      const hasPermission = await NotificationService.requestPermission();
      if (!hasPermission) return;

      await SalaryNotificationService.notifyNewCredits(newTransactions);
      await BudgetAlertService.checkAndNotify(budgetConfigs, allTransactions);
      await BillReminderService.scheduleUpcomingReminders(allTransactions);
    } catch {
      // Notifications are a convenience layer -- a failure here must never
      // surface as an import failure to the user.
    }
  }
};
