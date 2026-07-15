import { Transaction } from '../../types';
import { NotificationService } from './NotificationService';

// Categories that plausibly represent a recurring bill rather than a
// one-off purchase. Deliberately reuses CategoryEngine's existing category
// names -- no new data model, just pattern-matching on transactions that
// already exist.
const RECURRING_CATEGORIES = ['Rent', 'EMI', 'Loan', 'Insurance', 'Utilities', 'Recharge', 'Internet', 'Subscription'];

const MIN_INTERVAL_DAYS = 25;
const MAX_INTERVAL_DAYS = 35;
const REMINDER_LEAD_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

interface BillGroup {
  category: string;
  merchant: string;
  transactions: Transaction[];
}

function groupRecurringCandidates(transactions: Transaction[]): BillGroup[] {
  const groups = new Map<string, BillGroup>();
  for (const t of transactions) {
    if (t.type !== 'expense' || !RECURRING_CATEGORIES.includes(t.category)) continue;
    const key = `${t.category}|${t.merchant}`;
    const group = groups.get(key) ?? { category: t.category, merchant: t.merchant, transactions: [] };
    group.transactions.push(t);
    groups.set(key, group);
  }
  // Need at least two occurrences to infer any cadence at all.
  return Array.from(groups.values()).filter((g) => g.transactions.length >= 2);
}

function averageIntervalDays(sortedDates: Date[]): number {
  let totalDays = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    totalDays += (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / DAY_MS;
  }
  return totalDays / (sortedDates.length - 1);
}

function sanitizeId(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Lightweight recurrence detection over existing transactions -- no
 * separate "subscriptions" data model (that's its own future roadmap item).
 * Groups expense transactions by (category, merchant), and if at least two
 * occurrences cluster ~monthly, predicts the next due date and schedules a
 * reminder a few days ahead. Rescheduling with the same deterministic
 * notification ID naturally replaces any previous prediction for that bill,
 * so this can safely re-run after every import without needing its own
 * "already scheduled" tracking.
 */
export const BillReminderService = {
  async scheduleUpcomingReminders(transactions: Transaction[], now: Date = new Date()): Promise<void> {
    const groups = groupRecurringCandidates(transactions);

    for (const group of groups) {
      const sortedDates = [...group.transactions].map((t) => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
      const interval = averageIntervalDays(sortedDates);
      if (interval < MIN_INTERVAL_DAYS || interval > MAX_INTERVAL_DAYS) continue;

      const lastDate = sortedDates[sortedDates.length - 1];
      const nextDueDate = new Date(lastDate.getTime() + interval * DAY_MS);
      const reminderTime = nextDueDate.getTime() - REMINDER_LEAD_DAYS * DAY_MS;

      if (reminderTime <= now.getTime()) continue; // predicted due date already passed, or too close to bother scheduling

      const dueDateLabel = nextDueDate.toISOString().split('T')[0];
      const id = sanitizeId(`bill-${group.category}-${group.merchant}-${dueDateLabel}`);

      await NotificationService.scheduleAt(
        id,
        `${group.merchant} bill due soon`,
        `Your ${group.category.toLowerCase()} payment to ${group.merchant} is usually due around ${dueDateLabel}.`,
        reminderTime
      );
    }
  }
};
