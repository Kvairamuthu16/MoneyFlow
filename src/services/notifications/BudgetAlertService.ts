import { Budget, Transaction } from '../../types';
import { AppStorage } from '../../storage/mmkv';
import { computeBudgetsWithSpent } from '../../utils/budgets';
import { formatCurrency } from '../../utils/currency';
import { getCurrentYearMonth } from '../../utils/date';
import { NotificationService } from './NotificationService';

type ThresholdLevel = 80 | 100;

function alertKey(category: string, yearMonth: string, level: ThresholdLevel): string {
  return `${category}|${yearMonth}|${level}`;
}

function levelFor(spent: number, limit: number): ThresholdLevel | undefined {
  if (limit <= 0) return undefined;
  const pct = (spent / limit) * 100;
  if (pct >= 100) return 100;
  if (pct >= 80) return 80;
  return undefined;
}

/**
 * Notifies once per (category, month, threshold) the first time spend
 * crosses 80% or 100% of that category's budget for the *actual* current
 * calendar month -- not whatever month the user happens to be browsing in
 * the UI. Re-evaluated after every import, but the dedup set means a
 * category that's already past 100% doesn't re-notify on every subsequent
 * transaction.
 */
export const BudgetAlertService = {
  async checkAndNotify(budgetConfigs: Budget[], transactions: Transaction[]): Promise<void> {
    const yearMonth = getCurrentYearMonth();
    const budgetsWithSpent = computeBudgetsWithSpent(budgetConfigs, transactions, yearMonth);
    const { currency } = AppStorage.getSettings();
    const notifiedKeys = new Set(AppStorage.getNotifiedBudgetAlertKeys());
    const newlyNotified: string[] = [];

    for (const budget of budgetsWithSpent) {
      const level = levelFor(budget.spent, budget.limit);
      if (!level) continue;

      const key = alertKey(budget.category, yearMonth, level);
      if (notifiedKeys.has(key)) continue;

      const title = level === 100 ? `${budget.category} budget exceeded` : `${budget.category} budget at 80%`;
      const body =
        level === 100
          ? `You've spent ${formatCurrency(budget.spent, currency)} of your ${formatCurrency(budget.limit, currency)} ${budget.category} budget this month.`
          : `You've used 80% of your ${budget.category} budget (${formatCurrency(budget.spent, currency)} of ${formatCurrency(budget.limit, currency)}).`;

      await NotificationService.displayNow(`budget-${key}`, title, body);
      newlyNotified.push(key);
    }

    if (newlyNotified.length > 0) {
      AppStorage.saveNotifiedBudgetAlertKeys([...notifiedKeys, ...newlyNotified]);
    }
  }
};
