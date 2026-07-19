import { AppSettings, Transaction } from '../types';
import { formatCurrency } from './currency';
import { previousYearMonth } from './date';
import { computeContactSummaries, topReceivedFrom } from './contactInsights';
import { computeMerchantSummaries } from './merchantInsights';
import { detectRecurringPayments } from './recurringPayments';

export interface QueryAnswer {
  answer: string;
  transactions?: Transaction[];
}

function monthTotal(transactions: Transaction[], yearMonth: string, type: 'income' | 'expense'): number {
  return transactions.filter((t) => t.type === type && t.date.startsWith(yearMonth)).reduce((s, t) => s + t.amount, 0);
}

function monthExpenseByCategory(transactions: Transaction[], yearMonth: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'expense' && t.date.startsWith(yearMonth)) totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  return totals;
}

/**
 * A local "chat" query engine -- matches a handful of intents by keyword/regex
 * against locally stored transactions and answers directly. This is
 * deliberately NOT a real NLP/LLM system: this app makes no network calls by
 * design, so there is no cloud model to send the question to. Coverage is
 * intentionally scoped to the query shapes below; anything else gets an
 * honest "couldn't find that" rather than a guess.
 */
export function answerQuery(query: string, transactions: Transaction[], currency: AppSettings['currency'], selectedMonth: string): QueryAnswer {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { answer: 'Ask me something like "how much did I spend on Amazon" or "show my subscriptions".' };
  }

  // Failed transactions.
  if (q.includes('fail')) {
    const failed = transactions.filter((t) => t.status === 'failed');
    if (failed.length === 0) return { answer: 'No failed transactions found.' };
    return { answer: `Found ${failed.length} failed transaction${failed.length === 1 ? '' : 's'}.`, transactions: failed };
  }

  // Subscriptions / recurring payments.
  if (q.includes('subscription') || q.includes('recurring')) {
    const recurring = detectRecurringPayments(transactions);
    if (recurring.length === 0) return { answer: "I haven't detected any recurring payments yet." };
    const lines = recurring.map((r) => `${r.merchant}: ${formatCurrency(r.averageAmount, currency)}, next due ${r.nextDueDate}`).join('\n');
    return { answer: `You have ${recurring.length} recurring payment${recurring.length === 1 ? '' : 's'}:\n${lines}` };
  }

  // Who paid/sent the most.
  if ((q.includes('who') && (q.includes('paid me') || q.includes('sent me'))) || (q.includes('top') && q.includes('received'))) {
    const top = topReceivedFrom(computeContactSummaries(transactions), 1)[0];
    if (!top) return { answer: "I don't have any incoming person-to-person payments on record." };
    return { answer: `${top.label} has sent you the most: ${formatCurrency(top.totalReceived, currency)} in total.` };
  }

  // Compare this month vs last month.
  if (q.includes('compare')) {
    const prevMonth = previousYearMonth(selectedMonth);
    const currentExpense = monthTotal(transactions, selectedMonth, 'expense');
    const prevExpense = monthTotal(transactions, prevMonth, 'expense');
    if (prevExpense === 0) return { answer: "I don't have enough history from last month to compare yet." };
    const change = ((currentExpense - prevExpense) / prevExpense) * 100;
    const direction = change >= 0 ? 'more' : 'less';
    return {
      answer: `You've spent ${formatCurrency(currentExpense, currency)} this month vs ${formatCurrency(prevExpense, currency)} last month -- that's ${Math.abs(
        Math.round(change)
      )}% ${direction}.`
    };
  }

  // Why are expenses increasing.
  if (q.includes('why') && (q.includes('increas') || q.includes('expense') || q.includes('spending'))) {
    const prevMonth = previousYearMonth(selectedMonth);
    const currentExpense = monthTotal(transactions, selectedMonth, 'expense');
    const prevExpense = monthTotal(transactions, prevMonth, 'expense');
    if (prevExpense === 0 || currentExpense <= prevExpense) {
      return { answer: "Your spending isn't notably up compared to last month." };
    }

    const current = monthExpenseByCategory(transactions, selectedMonth);
    const prev = monthExpenseByCategory(transactions, prevMonth);
    let biggestCategory: string | undefined;
    let biggestDelta = 0;
    for (const [category, amount] of Object.entries(current)) {
      const delta = amount - (prev[category] || 0);
      if (delta > biggestDelta) {
        biggestDelta = delta;
        biggestCategory = category;
      }
    }

    const change = ((currentExpense - prevExpense) / prevExpense) * 100;
    if (biggestCategory) {
      return { answer: `Spending is up ${Math.round(change)}% vs last month, mostly driven by ${biggestCategory} (+${formatCurrency(biggestDelta, currency)}).` };
    }
    return { answer: `Spending is up ${Math.round(change)}% vs last month.` };
  }

  // How much can I safely save.
  if (q.includes('safely save') || (q.includes('how much') && q.includes('save'))) {
    const income = monthTotal(transactions, selectedMonth, 'income');
    const expense = monthTotal(transactions, selectedMonth, 'expense');
    if (income === 0) return { answer: "I don't see any income recorded this month yet." };
    const safe = income - expense;
    return {
      answer:
        safe > 0
          ? `Based on this month so far, you could safely save about ${formatCurrency(safe, currency)}.`
          : "Your expenses have already caught up with your income this month -- there's nothing left to safely save right now."
    };
  }

  // UPI payments above a threshold.
  const upiAboveMatch = q.match(/upi.*?(?:above|over|more than|>)\s*(?:rs\.?|inr|₹|\$)?\s*([\d,]+)/);
  if (upiAboveMatch) {
    const threshold = parseFloat(upiAboveMatch[1].replace(/,/g, ''));
    const matches = transactions.filter((t) => t.paymentMethod === 'UPI' && t.amount > threshold);
    if (matches.length === 0) return { answer: `No UPI payments above ${formatCurrency(threshold, currency)} found.` };
    const total = matches.reduce((s, t) => s + t.amount, 0);
    return {
      answer: `Found ${matches.length} UPI payment${matches.length === 1 ? '' : 's'} above ${formatCurrency(threshold, currency)}, totaling ${formatCurrency(total, currency)}.`,
      transactions: matches
    };
  }

  // Payments to a specific person.
  const toMatch = q.match(/(?:payments?|paid|sent)\s+to\s+([a-z0-9\s]+)/);
  if (toMatch) {
    const name = toMatch[1].trim();
    const match = computeContactSummaries(transactions).find((c) => c.label.toLowerCase().includes(name));
    if (!match) return { answer: `I couldn't find anyone matching "${name}" in your transactions.` };
    const relevant = transactions.filter(
      (t) => t.type === 'expense' && (t.contactName === match.label || t.mobileNumber === match.key || t.emailAddress === match.key || t.upiId === match.key)
    );
    return {
      answer: `You've sent ${match.label} a total of ${formatCurrency(match.totalSent, currency)} across ${relevant.length} payment${relevant.length === 1 ? '' : 's'}.`,
      transactions: relevant
    };
  }

  // Merchant or category spend.
  const spendMatch = q.match(/(?:spend|spent).*?\bon\s+([a-z0-9\s]+)/);
  if (spendMatch) {
    const target = spendMatch[1].trim();
    const merchantMatch = computeMerchantSummaries(transactions).find((m) => m.merchant.toLowerCase().includes(target));
    if (merchantMatch) {
      return {
        answer: `You've spent ${formatCurrency(merchantMatch.totalSpend, currency)} on ${merchantMatch.merchant} across ${merchantMatch.visitCount} transaction${
          merchantMatch.visitCount === 1 ? '' : 's'
        }.`
      };
    }

    const categoryTotal = transactions.filter((t) => t.type === 'expense' && t.category.toLowerCase() === target).reduce((s, t) => s + t.amount, 0);
    if (categoryTotal > 0) {
      return { answer: `You've spent ${formatCurrency(categoryTotal, currency)} on ${target} overall.` };
    }

    return { answer: `I couldn't find any spending on "${target}".` };
  }

  return { answer: "I couldn't find an answer to that. Try asking about a merchant, category, contact, subscriptions, or your recent spending." };
}
