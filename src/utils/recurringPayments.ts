import { Transaction } from '../types';

// Categories that plausibly represent a recurring bill rather than a
// one-off purchase. Deliberately reuses CategoryEngine's existing category
// names -- no new data model, just pattern-matching on transactions that
// already exist.
export const RECURRING_CATEGORIES = ['Rent', 'EMI', 'Loan', 'Insurance', 'Utilities', 'Recharge', 'Internet', 'Subscription'];

const MIN_INTERVAL_DAYS = 25;
const MAX_INTERVAL_DAYS = 35;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RecurringPayment {
  category: string;
  merchant: string;
  averageAmount: number;
  lastAmount: number;
  lastDate: string; // YYYY-MM-DD
  intervalDays: number;
  nextDueDate: string; // YYYY-MM-DD
  yearlyCost: number;
  occurrences: number;
}

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

/**
 * Detects recurring/subscription-like payments from transaction history --
 * groups expense transactions by (category, merchant) among bill-like
 * categories, and if at least two occurrences cluster ~monthly, computes
 * the predicted next due date and an estimated yearly cost. Shared by the
 * Subscriptions section on the Dashboard and BillReminderService's
 * push-notification scheduling, so there's only one place this detection
 * logic lives.
 */
export function detectRecurringPayments(transactions: Transaction[]): RecurringPayment[] {
  const groups = groupRecurringCandidates(transactions);
  const results: RecurringPayment[] = [];

  for (const group of groups) {
    const sorted = [...group.transactions].sort((a, b) => a.date.localeCompare(b.date));
    const sortedDates = sorted.map((t) => new Date(t.date));
    const interval = averageIntervalDays(sortedDates);
    if (interval < MIN_INTERVAL_DAYS || interval > MAX_INTERVAL_DAYS) continue;

    const lastTx = sorted[sorted.length - 1];
    const lastDate = sortedDates[sortedDates.length - 1];
    const nextDueDate = new Date(lastDate.getTime() + interval * DAY_MS);
    const averageAmount = sorted.reduce((s, t) => s + t.amount, 0) / sorted.length;
    const occurrencesPerYear = 365 / interval;

    results.push({
      category: group.category,
      merchant: group.merchant,
      averageAmount,
      lastAmount: lastTx.amount,
      lastDate: lastTx.date,
      intervalDays: Math.round(interval),
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      yearlyCost: averageAmount * occurrencesPerYear,
      occurrences: sorted.length
    });
  }

  return results.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
}
