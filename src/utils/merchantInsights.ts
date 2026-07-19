import { Transaction } from '../types';

export interface MerchantSummary {
  merchant: string;
  totalSpend: number;
  visitCount: number;
  averageSpend: number;
  highestBill: number;
  lastDate: string;
  weekendSpend: number;
  weekdaySpend: number;
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

/** Per-merchant spending stats over whatever transaction slice the caller passes (a single month, all-time, etc). */
export function computeMerchantSummaries(transactions: Transaction[]): MerchantSummary[] {
  const map = new Map<string, MerchantSummary>();

  for (const t of transactions) {
    if (t.type !== 'expense') continue;

    let entry = map.get(t.merchant);
    if (!entry) {
      entry = { merchant: t.merchant, totalSpend: 0, visitCount: 0, averageSpend: 0, highestBill: 0, lastDate: t.date, weekendSpend: 0, weekdaySpend: 0 };
      map.set(t.merchant, entry);
    }

    entry.totalSpend += t.amount;
    entry.visitCount += 1;
    entry.highestBill = Math.max(entry.highestBill, t.amount);
    if (t.date > entry.lastDate) entry.lastDate = t.date;
    if (isWeekend(t.date)) entry.weekendSpend += t.amount;
    else entry.weekdaySpend += t.amount;
    entry.averageSpend = entry.totalSpend / entry.visitCount;
  }

  return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
}
