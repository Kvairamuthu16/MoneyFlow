import { AppSettings, Budget, SmartInsight, Transaction } from '../types';
import { previousYearMonth } from './date';
import { formatCurrency } from './currency';

const DAY_MS = 24 * 60 * 60 * 1000;

// Categories where an above-average month is usually discretionary (worth
// flagging as a savings opportunity), as opposed to fixed obligations like
// Rent/EMI that aren't really "reducible" the same way.
const DISCRETIONARY_CATEGORIES = ['Food', 'Shopping', 'Entertainment', 'Groceries', 'Travel'];

function monthExpenseByCategory(transactions: Transaction[], yearMonth: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'expense' && t.date.startsWith(yearMonth)) {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    }
  }
  return totals;
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

/**
 * Rule-based ("AI") insight generation -- every insight here is a
 * deterministic computation over locally stored transactions/budgets, not a
 * hosted model call (this app has no network access by design). Insights
 * that would need data this app doesn't track yet (an emergency fund
 * balance, savings goals) are deliberately left out rather than fabricated.
 */
export function computeAiInsights(
  transactions: Transaction[],
  monthlyTransactions: Transaction[],
  budgets: Budget[],
  selectedMonth: string,
  currency: AppSettings['currency'],
  now: Date = new Date()
): SmartInsight[] {
  const list: SmartInsight[] = [];

  const income = monthlyTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthlyTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (expense > income && income > 0) {
    list.push({
      id: 'budget-alert',
      title: 'Budget Alert',
      description: 'Your monthly expenses have exceeded your total income.',
      type: 'danger',
      timestamp: 'Just now'
    });
  }

  const overBudget = budgets.filter((b) => b.limit > 0 && b.spent / b.limit >= 1);
  if (overBudget.length > 0) {
    list.push({
      id: 'over-budget',
      title: `${overBudget.length} ${overBudget.length === 1 ? 'Category' : 'Categories'} Over Budget`,
      description: overBudget.map((b) => b.category).join(', '),
      type: 'danger',
      timestamp: 'Today'
    });
  }

  // Spending trend vs the previous calendar month.
  const prevMonth = previousYearMonth(selectedMonth);
  const prevExpense = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(prevMonth)).reduce((s, t) => s + t.amount, 0);
  if (prevExpense > 0 && expense > 0) {
    const change = ((expense - prevExpense) / prevExpense) * 100;
    if (change >= 15) {
      list.push({
        id: 'spending-trend-up',
        title: 'Spending Is Trending Up',
        description: `Spending increased by ${Math.round(change)}% compared to last month.`,
        type: 'warning',
        timestamp: 'This month'
      });
    } else if (change <= -15) {
      list.push({
        id: 'spending-trend-down',
        title: 'Spending Is Down',
        description: `You spent ${Math.round(Math.abs(change))}% less than last month. Keep it up.`,
        type: 'success',
        timestamp: 'This month'
      });
    }
  }

  // Weekend vs weekday spending, per-day average (so a bigger weekday count doesn't dilute the comparison).
  const weekendExpenses = monthlyTransactions.filter((t) => t.type === 'expense' && isWeekend(t.date));
  const weekdayExpenses = monthlyTransactions.filter((t) => t.type === 'expense' && !isWeekend(t.date));
  if (weekendExpenses.length >= 2 && weekdayExpenses.length >= 2) {
    const weekendDays = new Set(weekendExpenses.map((t) => t.date)).size;
    const weekdayDays = new Set(weekdayExpenses.map((t) => t.date)).size;
    const weekendAvg = weekendExpenses.reduce((s, t) => s + t.amount, 0) / weekendDays;
    const weekdayAvg = weekdayExpenses.reduce((s, t) => s + t.amount, 0) / weekdayDays;
    if (weekdayAvg > 0 && weekendAvg / weekdayAvg >= 1.4) {
      list.push({
        id: 'weekend-overspend',
        title: 'Weekend Spending Is High',
        description: `You spend about ${Math.round((weekendAvg / weekdayAvg) * 100 - 100)}% more per day on weekends than on weekdays this month.`,
        type: 'info',
        timestamp: 'This month'
      });
    }
  }

  // Category outlier vs its own trailing 3-month average -- doubles as a savings opportunity.
  const currentByCategory = monthExpenseByCategory(monthlyTransactions, selectedMonth);
  let bestOutlier: { category: string; current: number; average: number } | undefined;
  for (const category of DISCRETIONARY_CATEGORIES) {
    const current = currentByCategory[category] || 0;
    if (current <= 0) continue;

    let priorMonth = selectedMonth;
    const priorTotals: number[] = [];
    for (let i = 0; i < 3; i++) {
      priorMonth = previousYearMonth(priorMonth);
      const total = monthExpenseByCategory(transactions, priorMonth)[category] || 0;
      if (total > 0) priorTotals.push(total);
    }
    if (priorTotals.length < 2) continue;

    const average = priorTotals.reduce((s, v) => s + v, 0) / priorTotals.length;
    if (average <= 0 || current <= average * 1.3) continue;

    const excess = current - average;
    if (!bestOutlier || excess > bestOutlier.current - bestOutlier.average) {
      bestOutlier = { category, current, average };
    }
  }
  if (bestOutlier) {
    const excess = bestOutlier.current - bestOutlier.average;
    list.push({
      id: 'category-outlier',
      title: `${bestOutlier.category} Spending Is Above Average`,
      description: `Your ${bestOutlier.category} spend is ${formatCurrency(bestOutlier.current, currency)} this month, above your usual ${formatCurrency(bestOutlier.average, currency)}. Bringing it back down could save you about ${formatCurrency(excess, currency)}.`,
      type: 'warning',
      timestamp: 'This month'
    });
  }

  // Merchant order-frequency spike vs last month.
  const merchantCountsThisMonth: Record<string, number> = {};
  for (const t of monthlyTransactions) {
    if (t.type === 'expense') merchantCountsThisMonth[t.merchant] = (merchantCountsThisMonth[t.merchant] || 0) + 1;
  }
  const merchantCountsLastMonth: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'expense' && t.date.startsWith(prevMonth)) {
      merchantCountsLastMonth[t.merchant] = (merchantCountsLastMonth[t.merchant] || 0) + 1;
    }
  }
  let merchantSpike: { merchant: string; count: number; prevCount: number } | undefined;
  for (const [merchant, count] of Object.entries(merchantCountsThisMonth)) {
    if (count < 3) continue;
    const prevCount = merchantCountsLastMonth[merchant] || 0;
    if (prevCount > 0 && count >= prevCount * 1.5) {
      if (!merchantSpike || count - prevCount > merchantSpike.count - merchantSpike.prevCount) {
        merchantSpike = { merchant, count, prevCount };
      }
    }
  }
  if (merchantSpike) {
    list.push({
      id: 'merchant-spike',
      title: `${merchantSpike.merchant} Orders Increased`,
      description: `${merchantSpike.count} orders from ${merchantSpike.merchant} this month, up from ${merchantSpike.prevCount} last month.`,
      type: 'info',
      timestamp: 'This month'
    });
  }

  // Predicted next salary date, only when there's a clear recurring (~monthly) pattern.
  const salaryTx = transactions
    .filter((t) => t.type === 'income' && t.category === 'Salary')
    .sort((a, b) => a.date.localeCompare(b.date));
  if (salaryTx.length >= 2) {
    const dates = salaryTx.map((t) => new Date(t.date));
    let totalDays = 0;
    for (let i = 1; i < dates.length; i++) totalDays += (dates[i].getTime() - dates[i - 1].getTime()) / DAY_MS;
    const avgInterval = totalDays / (dates.length - 1);

    if (avgInterval >= 25 && avgInterval <= 35) {
      const lastDate = dates[dates.length - 1];
      const predictedNext = new Date(lastDate.getTime() + avgInterval * DAY_MS);
      const daysUntil = Math.round((predictedNext.getTime() - now.getTime()) / DAY_MS);

      if (daysUntil >= 0 && daysUntil <= 5) {
        list.push({
          id: 'salary-expected',
          title: daysUntil === 0 ? 'Salary Expected Today' : daysUntil === 1 ? 'Salary Expected Tomorrow' : `Salary Expected In ${daysUntil} Days`,
          description: 'Based on your history, your salary is usually credited around this time.',
          type: 'success',
          timestamp: 'Upcoming'
        });
      }
    }
  }

  return list;
}
