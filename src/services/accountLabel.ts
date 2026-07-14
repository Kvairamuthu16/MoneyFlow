/** Human-readable "which account" label for multi-account households, e.g. "HDFC ••9892". */
export function getAccountLabel(bank: string, accountLast4?: string): string {
  return accountLast4 ? `${bank} ••${accountLast4}` : bank;
}
