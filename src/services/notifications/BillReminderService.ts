import { Transaction } from '../../types';
import { detectRecurringPayments } from '../../utils/recurringPayments';
import { NotificationService } from './NotificationService';

const REMINDER_LEAD_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function sanitizeId(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Schedules a local notification a few days ahead of each detected
 * recurring payment's predicted due date (see utils/recurringPayments.ts
 * for the detection itself). Rescheduling with the same deterministic
 * notification ID naturally replaces any previous prediction for that
 * bill, so this can safely re-run after every import without needing its
 * own "already scheduled" tracking.
 */
export const BillReminderService = {
  async scheduleUpcomingReminders(transactions: Transaction[], now: Date = new Date()): Promise<void> {
    const recurring = detectRecurringPayments(transactions);

    for (const payment of recurring) {
      const reminderTime = new Date(payment.nextDueDate).getTime() - REMINDER_LEAD_DAYS * DAY_MS;
      if (reminderTime <= now.getTime()) continue; // predicted due date already passed, or too close to bother scheduling

      const id = sanitizeId(`bill-${payment.category}-${payment.merchant}-${payment.nextDueDate}`);
      await NotificationService.scheduleAt(
        id,
        `${payment.merchant} bill due soon`,
        `Your ${payment.category.toLowerCase()} payment to ${payment.merchant} is usually due around ${payment.nextDueDate}.`,
        reminderTime
      );
    }
  }
};
