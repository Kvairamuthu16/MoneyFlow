import { Budget, Transaction } from '../types';
import { previousYearMonth } from './date';

export interface BudgetRecommendation {
  category: string;
  recommendedLimit: number;
  currentSpend: number;
  potentialSavings: number;
}

function monthExpenseForCategory(transactions: Transaction[], yearMonth: string, category: string): number {
  return transactions
    .filter((t) => t.type === 'expense' && t.category === category && t.date.startsWith(yearMonth))
    .reduce((s, t) => s + t.amount, 0);
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Suggests a budget limit for categories the user hasn't budgeted yet,
 * based on that category's own trailing spend history -- never
 * second-guesses a budget the user already set. Only recommends when there
 * are at least 2 prior months of spend in that category to base it on, and
 * only when this month's spend is already meaningfully above that trailing
 * average (otherwise there's nothing to recommend against).
 */
export function computeRecommendedBudgets(transactions: Transaction[], budgetConfigs: Budget[], yearMonth: string): BudgetRecommendation[] {
  const budgetedCategories = new Set(budgetConfigs.map((b) => b.category));
  const categoriesSeen = new Set(transactions.filter((t) => t.type === 'expense').map((t) => t.category));

  const recommendations: BudgetRecommendation[] = [];

  for (const category of categoriesSeen) {
    if (budgetedCategories.has(category)) continue;

    const currentSpend = monthExpenseForCategory(transactions, yearMonth, category);
    if (currentSpend <= 0) continue;

    let priorMonth = yearMonth;
    const priorTotals: number[] = [];
    for (let i = 0; i < 3; i++) {
      priorMonth = previousYearMonth(priorMonth);
      const total = monthExpenseForCategory(transactions, priorMonth, category);
      if (total > 0) priorTotals.push(total);
    }
    if (priorTotals.length < 2) continue;

    const average = priorTotals.reduce((s, v) => s + v, 0) / priorTotals.length;
    const recommendedLimit = roundToNearest(average, 100);
    if (currentSpend <= recommendedLimit) continue; // nothing to recommend if already under a sustainable level

    recommendations.push({
      category,
      recommendedLimit,
      currentSpend,
      potentialSavings: currentSpend - recommendedLimit
    });
  }

  return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
}
