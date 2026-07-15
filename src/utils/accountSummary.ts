import { Transaction } from '../types';
import { getAccountLabel } from '../services/accountLabel';

export interface AccountSummary {
  label: string; // e.g. "HDFC ••9892"
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
 * Segregates transactions by (bank, account) -- the same identity
 * TransactionsScreen already filters by (see getAccountLabel). `yearMonth`
 * scopes the income/expense totals to one month; `latestBalance` always
 * reflects the most recent SMS for that account regardless of month, since
 * "current standing" isn't a per-month concept.
 */
export function computeAccountSummaries(transactions: Transaction[], yearMonth: string): AccountSummary[] {
  const byLabel = new Map<string, AccountSummary>();

  // Oldest first, so the last write per account (below) is genuinely the most recent.
  const chronological = [...transactions].sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));

  for (const t of chronological) {
    const label = getAccountLabel(t.bank, t.accountLast4);
    let entry = byLabel.get(label);
    if (!entry) {
      entry = { label, bank: t.bank, accountLast4: t.accountLast4, monthIncome: 0, monthExpense: 0, transactionCount: 0 };
      byLabel.set(label, entry);
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

  return Array.from(byLabel.values()).sort((a, b) => b.transactionCount - a.transactionCount);
}
