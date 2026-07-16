/** Human-readable "which account" label for multi-account households, e.g. "HDFC ••9892". */
export function getAccountLabel(bank: string, accountLast4?: string): string {
  return accountLast4 ? `${bank} ••${accountLast4}` : bank;
}

/**
 * Stable identity key for "is this the same bank account" -- robust to
 * banks masking a different number of trailing digits across message
 * templates (e.g. "A/C *9892" vs "a/c XX892" for the very same account, or
 * one bank consistently revealing 3 digits while another reveals 4-6).
 * Comparing only the last 3 digits is the safest common denominator, since
 * 3 is the fewest any bank SMS format in this parser reveals. Used anywhere
 * accountLast4 needs to answer "same account?" rather than just be
 * displayed -- duplicate detection, account segregation/filtering.
 */
export function getAccountKey(bank: string, accountLast4?: string): string {
  const normalizedBank = bank.trim().toLowerCase();
  const last3 = accountLast4 ? accountLast4.slice(-3) : '';
  return `${normalizedBank}|${last3}`;
}

/**
 * Collapses a list of (bank, accountLast4) pairs into one entry per distinct
 * account (via getAccountKey), keeping the most specific (longest) masked
 * digits seen for that account as its display label.
 */
export function collectDistinctAccounts(
  items: Array<{ bank: string; accountLast4?: string }>
): Array<{ key: string; bank: string; accountLast4?: string; label: string }> {
  const byKey = new Map<string, { bank: string; accountLast4?: string }>();

  for (const item of items) {
    const key = getAccountKey(item.bank, item.accountLast4);
    const existing = byKey.get(key);
    if (!existing || (item.accountLast4 && (!existing.accountLast4 || item.accountLast4.length > existing.accountLast4.length))) {
      byKey.set(key, { bank: item.bank, accountLast4: item.accountLast4 });
    }
  }

  return Array.from(byKey.entries()).map(([key, v]) => ({ key, bank: v.bank, accountLast4: v.accountLast4, label: getAccountLabel(v.bank, v.accountLast4) }));
}
