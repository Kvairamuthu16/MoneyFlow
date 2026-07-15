import { Budget, Transaction } from '../types';

/**
 * Recomputes each budget's `spent` from real transactions for the given
 * month -- the stored Budget record's own `spent` field is never trusted.
 * Shared between AppDataContext (UI) and BudgetAlertService (background
 * notification checks have no React context to read live state from).
 */
export function computeBudgetsWithSpent(budgetConfigs: Budget[], transactions: Transaction[], yearMonth: string): Budget[] {
  const spentByCategory: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'expense' && t.date.startsWith(yearMonth)) {
      spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
    }
  }
  return budgetConfigs.map((b) => ({ ...b, spent: spentByCategory[b.category] || 0 }));
}
