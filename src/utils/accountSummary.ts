import { Transaction } from '../types';
import { getAccountLabel, getAccountKey } from '../services/accountLabel';

export interface AccountSummary {
  key: string; // getAccountKey(bank, accountLast4) -- stable identity, safe to use as a filter/nav param
  label: string; // e.g. "HDFC ••9892" -- uses the most specific (longest) masked digits seen for this account
  bank: string;
  accountLast4?: string;
  /** Most recent balance reported by any SMS for this account, regardless of which month is selected. */
  latestBalance?: number;
  lastActivityDate?: string;
  monthIncome: number;
  monthExpense: number;
  transactionCount: number;
}

/**
 * Segregates transactions by (bank, account) -- identity is via
 * getAccountKey (bank + last 3 digits), not an exact accountLast4 match,
 * since two SMS for the same real account can mask a different number of
 * trailing digits (e.g. "A/C *9892" vs "a/c XX892"); comparing only the
 * last 3 avoids fragmenting one account into two entries over that. The
 * displayed label still uses the most specific (longest) digits seen.
 * `yearMonth` scopes the income/expense totals to one month; `latestBalance`
 * always reflects the most recent SMS for that account regardless of
 * month, since "current standing" isn't a per-month concept.
 */
export function computeAccountSummaries(transactions: Transaction[], yearMonth: string): AccountSummary[] {
  const byKey = new Map<string, AccountSummary>();

  // Oldest first, so the last write per account (below) is genuinely the most recent.
  const chronological = [...transactions].sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));

  for (const t of chronological) {
    const key = getAccountKey(t.bank, t.accountLast4);
    let entry = byKey.get(key);
    if (!entry) {
      entry = { key, label: getAccountLabel(t.bank, t.accountLast4), bank: t.bank, accountLast4: t.accountLast4, monthIncome: 0, monthExpense: 0, transactionCount: 0 };
      byKey.set(key, entry);
    }

    // Prefer the most specific (longest) masked digits seen for this account when labeling it.
    if (t.accountLast4 && (!entry.accountLast4 || t.accountLast4.length > entry.accountLast4.length)) {
      entry.accountLast4 = t.accountLast4;
      entry.label = getAccountLabel(entry.bank, t.accountLast4);
    }

    entry.transactionCount += 1;
    if (t.date.startsWith(yearMonth)) {
      if (t.type === 'income') entry.monthIncome += t.amount;
      else entry.monthExpense += t.amount;
    }
    if (t.balanceAfter !== undefined) {
      entry.latestBalance = t.balanceAfter;
      entry.lastActivityDate = t.date;
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.transactionCount - a.transactionCount);
}
