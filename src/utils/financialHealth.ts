import { Budget, Transaction } from '../types';
import { computeBudgetsWithSpent } from './budgets';
import { getRecentMonths } from './date';

export interface HealthFactor {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number; // relative weight actually used in the overall average
  detail: string;
}

export type HealthBand = 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' | 'Critical';

export interface FinancialHealthResult {
  score: number; // 0-100, or 0 with no factors if there's not enough data yet
  band: HealthBand;
  factors: HealthFactor[];
  trend: Array<{ month: string; score: number }>;
}

// Recurring/fixed monthly obligations -- reuses CategoryEngine's own category
// names, no separate taxonomy to keep in sync.
const FIXED_OBLIGATION_CATEGORIES = ['EMI', 'Loan', 'Subscription'];

function monthTotal(transactions: Transaction[], yearMonth: string, type: 'income' | 'expense', categories?: string[]): number {
  return transactions
    .filter((t) => t.type === type && t.date.startsWith(yearMonth) && (!categories || categories.includes(t.category)))
    .reduce((s, t) => s + t.amount, 0);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Coefficient of variation (stdev/mean) across non-zero months -- undefined when there isn't enough data to say anything meaningful. */
function coefficientOfVariation(values: number[]): number | undefined {
  const nonZero = values.filter((v) => v > 0);
  if (nonZero.length < 2) return undefined;
  const mean = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
  if (mean === 0) return undefined;
  const variance = nonZero.reduce((s, v) => s + (v - mean) ** 2, 0) / nonZero.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Scores one month using only factors we can actually compute from real
 * local data -- no fabricated inputs like "emergency fund" or "investment
 * habits" that this app has no data model for. A factor is simply omitted
 * (not scored as 0) when there isn't enough data for it yet, and the
 * remaining factors' weights are renormalized, so a new user with sparse
 * history isn't unfairly penalized.
 */
function scoreForMonth(transactions: Transaction[], budgetConfigs: Budget[], yearMonth: string, historyWindow: string[]): { score: number; factors: HealthFactor[] } {
  const factors: HealthFactor[] = [];

  const income = monthTotal(transactions, yearMonth, 'income');
  const expense = monthTotal(transactions, yearMonth, 'expense');

  // 1. Savings rate -- 30%+ of income saved scores full marks.
  if (income > 0) {
    const rate = (income - expense) / income;
    factors.push({
      key: 'savings',
      label: 'Savings Rate',
      score: clampScore(rate <= 0 ? 0 : (rate / 0.3) * 100),
      weight: 0.3,
      detail: `${Math.round(rate * 100)}% of income saved this month`
    });
  }

  // 2. Budget adherence -- only counts categories the user actually budgeted.
  const budgetsWithSpent = computeBudgetsWithSpent(budgetConfigs, transactions, yearMonth).filter((b) => b.limit > 0);
  if (budgetsWithSpent.length > 0) {
    const withinLimit = budgetsWithSpent.filter((b) => b.spent <= b.limit).length;
    factors.push({
      key: 'budget',
      label: 'Budget Adherence',
      score: clampScore((withinLimit / budgetsWithSpent.length) * 100),
      weight: 0.2,
      detail: `${withinLimit} of ${budgetsWithSpent.length} budgets on track`
    });
  }

  // 3. Spending consistency across the trailing window.
  const expenseCV = coefficientOfVariation(historyWindow.map((m) => monthTotal(transactions, m, 'expense')));
  if (expenseCV !== undefined) {
    factors.push({
      key: 'consistency',
      label: 'Spending Consistency',
      score: clampScore(100 - expenseCV * 150),
      weight: 0.15,
      detail: expenseCV < 0.2 ? 'Your spending is steady month to month' : 'Your spending swings noticeably month to month'
    });
  }

  // 4. Fixed obligations (EMI/Loan/Subscription) as a share of income -- 50%+ scores zero.
  if (income > 0) {
    const fixed = monthTotal(transactions, yearMonth, 'expense', FIXED_OBLIGATION_CATEGORIES);
    const ratio = fixed / income;
    factors.push({
      key: 'obligations',
      label: 'Fixed Obligations',
      score: clampScore(100 - (ratio / 0.5) * 100),
      weight: 0.2,
      detail: `${Math.round(ratio * 100)}% of income goes to EMIs, loans, and subscriptions`
    });
  }

  // 5. Income stability across the trailing window.
  const incomeCV = coefficientOfVariation(historyWindow.map((m) => monthTotal(transactions, m, 'income')));
  if (incomeCV !== undefined) {
    factors.push({
      key: 'income-stability',
      label: 'Income Stability',
      score: clampScore(100 - incomeCV * 150),
      weight: 0.15,
      detail: incomeCV < 0.15 ? 'Your income is consistent month to month' : 'Your income varies noticeably month to month'
    });
  }

  if (factors.length === 0) {
    return { score: 0, factors: [] };
  }

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const overall = factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight;
  return { score: Math.round(overall), factors };
}

function bandFor(score: number): HealthBand {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Needs Attention';
  return 'Critical';
}

/**
 * Financial Health Score (0-100): a weighted blend of savings rate, budget
 * adherence, spending/income consistency, and fixed-obligation load, all
 * computed from transactions/budgets already stored locally. Always
 * evaluated against the real current month, not whatever month the user
 * happens to be browsing (same convention as BudgetAlertService).
 */
export function computeFinancialHealthScore(transactions: Transaction[], budgetConfigs: Budget[], now: Date = new Date()): FinancialHealthResult {
  const months = getRecentMonths(6, now).reverse(); // oldest -> newest, last entry is the current month

  const trend = months.map((month, idx) => {
    const window = months.slice(Math.max(0, idx - 2), idx + 1); // up to 3 months ending at `month`
    return { month, score: scoreForMonth(transactions, budgetConfigs, month, window).score };
  });

  const currentMonth = months[months.length - 1];
  const currentWindow = months.slice(Math.max(0, months.length - 3), months.length);
  const { score, factors } = scoreForMonth(transactions, budgetConfigs, currentMonth, currentWindow);

  return { score, band: bandFor(score), factors, trend };
}
