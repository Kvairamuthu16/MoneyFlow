import { LearningService } from './LearningService';

// Single source of truth for every category CategoryEngine can produce.
// Anything that displays/edits a transaction's category (budgets seed data,
// the Transactions screen's recategorize control, etc.) should reference
// this list instead of hardcoding its own -- a mismatched name here means a
// transaction silently stops counting against any budget.
export const ALL_CATEGORIES = [
  'Food',
  'Groceries',
  'Medical',
  'Fuel',
  'Transport',
  'Travel',
  'Shopping',
  'Entertainment',
  'Recharge',
  'Internet',
  'Utilities',
  'Insurance',
  'Rent',
  'EMI',
  'Loan',
  'Subscription',
  'Gifts',
  'Taxes',
  'Salary',
  'Income',
  'Investment',
  'Education',
  'Cash',
  'Cashback',
  'Refund',
  'Transfer',
  'Other'
] as const;

type Rule = { category: (typeof ALL_CATEGORIES)[number]; keywords: string[] };

// Order matters: first matching rule wins. Specific merchant/keyword signals
// are listed before generic catch-alls (e.g. named Entertainment merchants
// before the generic "Subscription" bucket) so a Netflix payment doesn't
// fall into the generic recurring-payment category just because it's also
// technically a subscription renewal.
const RULES: Rule[] = [
  { category: 'Food', keywords: ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'mcdonald', 'starbucks'] },
  { category: 'Groceries', keywords: ['blinkit', 'zepto', 'instamart', 'grocery', 'groceries', 'supermarket', 'dmart', 'bigbasket', 'big basket'] },
  { category: 'Medical', keywords: ['hospital', 'pharmacy', 'medical', 'chemist', 'apollo', 'dentist', 'clinic'] },
  { category: 'Fuel', keywords: ['hpcl', 'bpcl', 'iocl', 'indian oil', 'bharat petroleum', 'petrol', 'fuel', 'shell', 'gas station'] },
  { category: 'Transport', keywords: ['uber', 'ola', 'rapido', 'taxi', 'cab'] },
  { category: 'Travel', keywords: ['metro', 'rail', 'flight', 'irctc', 'indigo', 'make-my-trip', 'makemytrip', 'goibibo', 'yatra', 'hotel', 'oyo'] },
  { category: 'Shopping', keywords: ['myntra', 'amazon', 'flipkart', 'ajio', 'clothing', 'shopping', 'apparel', 'decathlon'] },
  { category: 'Entertainment', keywords: ['netflix', 'spotify', 'hotstar', 'bookmyshow', 'pvr', 'cinema', 'game', 'gaming', 'prime video'] },
  { category: 'Recharge', keywords: ['mobile recharge', 'recharge', 'jio', 'airtel', 'vi ', 'vodafone'] },
  { category: 'Internet', keywords: ['broadband', 'act fibernet', 'wifi', 'fiber', 'telecom'] },
  { category: 'Utilities', keywords: ['electricity', 'water bill', 'water board', 'bescom', 'tneb', 'gas bill', 'piped gas', 'electricity board'] },
  { category: 'Insurance', keywords: ['lic ', 'insurance', 'hdfc ergo', 'policybazaar'] },
  { category: 'Rent', keywords: ['rent', 'landlord', 'broker', 'housing'] },
  { category: 'EMI', keywords: ['emi', 'installment due', 'auto debit', 'standing instruction', 'cred '] },
  { category: 'Loan', keywords: ['loan disbursed', 'loan repayment', 'personal loan', 'loan account'] },
  { category: 'Subscription', keywords: ['subscription', 'auto-renewal', 'auto renewal', 'recurring payment'] },
  { category: 'Gifts', keywords: ['gift card', 'gifting', 'gift voucher', ' gift '] },
  { category: 'Taxes', keywords: ['income tax', 'gst', 'tds', 'tax payment', 'advance tax'] },
  { category: 'Salary', keywords: ['salary', 'payroll', 'wages', 'employer'] },
  { category: 'Cashback', keywords: ['cashback', 'reward credit', 'reward points credited'] },
  { category: 'Refund', keywords: ['refund', 'reversed', 'reversal'] },
  { category: 'Income', keywords: ['credited from', 'interest credited', 'interest earned'] },
  { category: 'Investment', keywords: ['zerodha', 'groww', 'mutual fund', 'sip', 'etmoney', 'investment', 'stock'] },
  { category: 'Education', keywords: ['tuition', 'school', 'college', 'udemy', 'coursera', 'education'] },
  { category: 'Cash', keywords: ['cash withdrawal', 'atm', 'cash dispensed', 'cash deposit'] },
  { category: 'Transfer', keywords: ['phonepe', 'gpay', 'google pay', 'paytm', 'upi'] }
];

function ruleBasedCategory(merchant: string, text: string): string {
  const query = `${merchant} ${text}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => query.includes(kw))) {
      return rule.category;
    }
  }
  return 'Other';
}

/**
 * Categorizes a transaction. A user-taught override for this merchant
 * (see LearningService) always wins over the keyword rules -- that's the
 * whole point of the learning loop.
 */
export function categorize(merchant: string, text: string): string {
  const learned = LearningService.getOverride(merchant);
  if (learned) return learned;
  return ruleBasedCategory(merchant, text);
}

export const CategoryEngine = { categorize, ALL_CATEGORIES };
