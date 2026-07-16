/** Human-readable "which account" label for multi-account households, e.g. "HDFC ••9892". */
export function getAccountLabel(bank: string, accountLast4?: string): string {
  return accountLast4 ? `${bank} ••${accountLast4}` : bank;
}

/**
 * Whether two (bank, masked-digits) pairs plausibly refer to the same real
 * bank account.
 *
 * Banks mask a different number of trailing digits across message templates
 * (e.g. "A/C *9892" vs "a/c XX892" for the very same account) -- so when the
 * two masks are different LENGTHS, treating the shorter as a suffix of the
 * longer correctly recognizes them as one account.
 *
 * But when both masks are the SAME length and simply not identical (e.g.
 * "1234" vs "5234"), that's almost certainly two different real accounts
 * that happen to share trailing digits by coincidence -- collapsing those
 * would silently merge unrelated accounts (and, in duplicate detection,
 * could wrongly drop a genuine transaction). Only a strict equal match
 * counts there.
 */
export function isSameAccount(bankA: string, last4A: string | undefined, bankB: string, last4B: string | undefined): boolean {
  if (bankA.trim().toLowerCase() !== bankB.trim().toLowerCase()) return false;
  if (!last4A || !last4B) return !last4A && !last4B;
  if (last4A === last4B) return true;
  if (last4A.length === last4B.length) return false;
  const [shorter, longer] = last4A.length < last4B.length ? [last4A, last4B] : [last4B, last4A];
  return longer.endsWith(shorter);
}

export interface AccountGroup<T> {
  key: string;
  bank: string;
  accountLast4?: string;
  label: string;
  items: T[];
}

/**
 * Groups a list of (bank, accountLast4) items into one entry per distinct
 * real account (via isSameAccount), keeping the most specific (longest)
 * masked digits seen as the group's label/key. Pairwise comparison rather
 * than a hashed key, since "same account" isn't expressible as a single
 * derived string without losing the same-length-must-be-exact distinction.
 */
export function groupByAccount<T extends { bank: string; accountLast4?: string }>(items: T[]): AccountGroup<T>[] {
  const groups: AccountGroup<T>[] = [];

  for (const item of items) {
    const group = groups.find((g) => isSameAccount(g.bank, g.accountLast4, item.bank, item.accountLast4));
    if (!group) {
      const label = getAccountLabel(item.bank, item.accountLast4);
      groups.push({ key: label, bank: item.bank, accountLast4: item.accountLast4, label, items: [item] });
      continue;
    }

    // Prefer the most specific (longest) masked digits seen for this account when labeling/keying it.
    if (item.accountLast4 && (!group.accountLast4 || item.accountLast4.length > group.accountLast4.length)) {
      group.accountLast4 = item.accountLast4;
      group.label = getAccountLabel(group.bank, item.accountLast4);
      group.key = group.label;
    }
    group.items.push(item);
  }

  return groups;
}

/** Collapses a list of (bank, accountLast4) pairs into one label per distinct real account -- see groupByAccount. */
export function collectDistinctAccounts(
  items: Array<{ bank: string; accountLast4?: string }>
): Array<{ key: string; bank: string; accountLast4?: string; label: string }> {
  return groupByAccount(items).map(({ key, bank, accountLast4, label }) => ({ key, bank, accountLast4, label }));
}
