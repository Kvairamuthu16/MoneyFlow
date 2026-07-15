const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The actual current calendar month as "YYYY-MM" -- distinct from settings.selectedMonth, which is whatever month the user happens to be browsing in the UI. */
export function getCurrentYearMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

/** Returns the last `count` "YYYY-MM" strings, most recent first, ending at the current month. */
export function getRecentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function getDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Days elapsed in the given month: today's date if it's the current month, else the full month length. */
export function getDaysElapsed(yearMonth: string): number {
  const now = new Date();
  const [y, m] = yearMonth.split('-').map(Number);
  const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
  return isCurrentMonth ? now.getDate() : getDaysInMonth(yearMonth);
}
