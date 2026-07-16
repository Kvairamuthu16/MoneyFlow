import { Transaction } from '../types';
import { groupByAccount } from '../services/accountLabel';

export interface AccountSummary {
  key: string; // stable per-account identity, safe to use as a filter/nav param
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
 * isSameAccount (bank + digit-mask comparison; see accountLabel.ts), not an
 * exact accountLast4 match, since two SMS for the same real account can
 * mask a different number of trailing digits (e.g. "A/C *9892" vs "a/c
 * XX892"). The displayed label uses the most specific (longest) digits
 * seen. `yearMonth` scopes the income/expense totals to one month;
 * `latestBalance` always reflects the most recent SMS for that account
 * regardless of month, since "current standing" isn't a per-month concept.
 */
export function computeAccountSummaries(transactions: Transaction[], yearMonth: string): AccountSummary[] {
  // Oldest first, so scanning each group's own items for the latest balance
  // (below) finds the chronologically most recent one.
  const chronological = [...transactions].sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));

  const groups = groupByAccount(chronological);

  const summaries = groups.map((group): AccountSummary => {
    let monthIncome = 0;
    let monthExpense = 0;
    let latestBalance: number | undefined;
    let lastActivityDate: string | undefined;

    for (const t of group.items) {
      if (t.date.startsWith(yearMonth)) {
        if (t.type === 'income') monthIncome += t.amount;
        else monthExpense += t.amount;
      }
      if (t.balanceAfter !== undefined) {
        latestBalance = t.balanceAfter;
        lastActivityDate = t.date;
      }
    }

    return {
      key: group.key,
      label: group.label,
      bank: group.bank,
      accountLast4: group.accountLast4,
      latestBalance,
      lastActivityDate,
      monthIncome,
      monthExpense,
      transactionCount: group.items.length
    };
  });

  return summaries.sort((a, b) => b.transactionCount - a.transactionCount);
}
