import { Transaction } from '../types';

export interface ContactSummary {
  key: string; // stable identity: contact name, mobile number, email, or UPI ID, in that priority
  label: string; // best display name currently known for this key
  totalSent: number;
  totalReceived: number;
  netBalance: number; // totalReceived - totalSent; positive means they've paid you more than you've paid them
  transactionCount: number;
  lastDate: string;
}

// Identity for grouping must be a stable raw identifier, not the resolved
// display name -- contactName only gets filled in on some transactions for
// a given person (contact resolution can succeed or be toggled on later),
// so keying on it directly would split one real contact into two entries
// the moment their name gets resolved. contactName is only ever set
// alongside one of these raw identifiers (see TransactionImportService),
// so it's a safe last-resort key, never the primary one.
function contactKey(t: Transaction): string | undefined {
  return t.mobileNumber || t.emailAddress || t.upiId || t.contactName;
}

/**
 * Per-counterparty stats for person-to-person transactions -- only
 * transactions where a contact name, phone number, email, or UPI ID was
 * captured count (merchant/business purchases with none of those are
 * excluded, since "who do I pay the most" is about people, not shops).
 */
export function computeContactSummaries(transactions: Transaction[]): ContactSummary[] {
  const map = new Map<string, ContactSummary>();

  for (const t of transactions) {
    const key = contactKey(t);
    if (!key) continue;

    let entry = map.get(key);
    if (!entry) {
      entry = { key, label: t.contactName || key, totalSent: 0, totalReceived: 0, netBalance: 0, transactionCount: 0, lastDate: t.date };
      map.set(key, entry);
    }

    if (t.type === 'expense') entry.totalSent += t.amount;
    else entry.totalReceived += t.amount;
    entry.netBalance = entry.totalReceived - entry.totalSent;
    entry.transactionCount += 1;
    if (t.date > entry.lastDate) entry.lastDate = t.date;
    // A later transaction resolving a real contact name upgrades the label, even if an earlier one only had a raw identifier.
    if (t.contactName) entry.label = t.contactName;
  }

  return Array.from(map.values()).sort((a, b) => b.transactionCount - a.transactionCount);
}

export function topPaidTo(summaries: ContactSummary[], limit = 5): ContactSummary[] {
  return summaries
    .filter((s) => s.totalSent > 0)
    .sort((a, b) => b.totalSent - a.totalSent)
    .slice(0, limit);
}

export function topReceivedFrom(summaries: ContactSummary[], limit = 5): ContactSummary[] {
  return summaries
    .filter((s) => s.totalReceived > 0)
    .sort((a, b) => b.totalReceived - a.totalReceived)
    .slice(0, limit);
}
