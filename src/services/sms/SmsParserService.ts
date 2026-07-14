import { PaymentMethod, TransactionType } from '../../types';
import { TRANSACTION_AMOUNT_REGEX, TRANSACTION_VERB_REGEX } from './SmsFilterService';

export interface ParsedSmsFields {
  amount: number;
  currency: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  bank: string;
  accountLast4?: string;
  merchantRaw: string;
  receiverName?: string;
  senderName?: string;
  upiId?: string;
  referenceNumber?: string;
  balanceAfter?: number;
  confidenceScore: number;
}

const CURRENCY_BY_SYMBOL: Array<[RegExp, string]> = [
  [/(?:Rs\.?|INR\.?|₹)/i, 'INR'],
  [/(?:USD|\$)/i, 'USD'],
  [/EUR/i, 'EUR'],
  [/£/, 'GBP']
];

function detectCurrency(text: string): string {
  for (const [regex, code] of CURRENCY_BY_SYMBOL) {
    if (regex.test(text)) return code;
  }
  return 'INR';
}

const BANK_KEYWORDS = [
  'hdfc',
  'sbi',
  'icici',
  'axis',
  'kotak',
  'pnb',
  'bob',
  'canara',
  'indian bank',
  'iob',
  'federal',
  'idfc',
  'indusind',
  'yes bank',
  'hsbc',
  'citi',
  'chase',
  'wells fargo',
  'revolut',
  'razorpay',
  'cashfree',
  'stripe',
  'paytm',
  'phonepe',
  'google pay',
  'bhim'
];

function detectBank(lowerText: string, text: string): string {
  for (const keyword of BANK_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return keyword.toUpperCase();
    }
  }
  const shortCodeMatch = text.match(/^([A-Z]{2})-[A-Z]+/);
  if (shortCodeMatch) {
    return shortCodeMatch[1];
  }
  return 'Unknown Bank';
}

function detectPaymentMethod(lowerText: string): PaymentMethod {
  if (lowerText.includes('fastag')) return 'FASTag';
  if (lowerText.includes('standing instruction')) return 'Standing Instruction';
  if (lowerText.includes('auto debit') || lowerText.includes('autopay')) return 'Auto Debit';
  if (lowerText.includes('cheque') || lowerText.includes('chq')) return 'Cheque';
  if (lowerText.includes('tap & pay') || lowerText.includes('tap and pay') || lowerText.includes('contactless')) return 'Tap & Pay';
  if (lowerText.includes('neft')) return 'NEFT';
  if (lowerText.includes('rtgs')) return 'RTGS';
  if (lowerText.includes('imps')) return 'IMPS';
  if (lowerText.includes('cash deposit') || lowerText.includes('cash deposited')) return 'Cash Deposit';
  if (lowerText.includes('atm') || lowerText.includes('cash dispensed')) return 'ATM';
  if (lowerText.includes('upi') || lowerText.includes('gpay') || lowerText.includes('phonepe') || lowerText.includes('paytm upi')) return 'UPI';
  if (lowerText.includes('cash')) return 'Cash';
  if (lowerText.includes('credit card') || lowerText.includes('cc ending') || (lowerText.includes('card ending') && lowerText.includes('cc'))) {
    return 'Credit Card';
  }
  if (lowerText.includes('debit card') || lowerText.includes('dc ending') || lowerText.includes('card ending')) return 'Debit Card';
  if (lowerText.includes('wallet') || lowerText.includes('paytm wallet') || lowerText.includes('amazon pay')) return 'Wallet';
  if (lowerText.includes('bank transfer')) return 'Bank Transfer';
  return 'Other';
}

const MERCHANT_PATTERNS = [
  // Bank apps frequently lay a transaction out as separate labeled lines
  // (e.g. "Sent Rs.80\nFrom HDFC Bank A/C *9892\nTo BISMI STORES\nOn
  // 13/07/26"), so a bare "to" (word-bounded, to avoid matching inside
  // "into"/"auto") has to be recognized too, not just "paid to"/"payment to".
  /(?:spent at|spent on|paid to|payment to|sent to|\bto\b|at|info:)\s+([A-Za-z0-9\s.*&]+?)(?:\s+on|\s+via|\s+balance|\s+Ref|\s+RefNo|\s+with|\.|$)/i
];

const SENDER_PATTERNS = [/(?:credited from|received from|salary from)\s+([A-Za-z0-9\s.*&]+?)(?:\s+on|\s+via|\s+balance|\s+Ref|\s+with|\.|$)/i];

const IGNORED_MERCHANT_CANDIDATES = ['upi', 'debit', 'credit', 'card', 'account', 'ref', 'vpa'];

function extractCandidate(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate.length > 2 && candidate.length < 32 && !IGNORED_MERCHANT_CANDIDATES.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
  }
  return undefined;
}

const KNOWN_MERCHANT_HINTS: Array<[string, string]> = [
  ['swiggy', 'Swiggy'],
  ['zomato', 'Zomato'],
  ['blinkit', 'Blinkit'],
  ['netflix', 'Netflix'],
  ['spotify', 'Spotify'],
  ['amazon', 'Amazon'],
  ['flipkart', 'Flipkart'],
  ['uber', 'Uber'],
  ['ola', 'Ola'],
  ['cred', 'CRED Bill Payment'],
  ['bescom', 'BESCOM'],
  ['jio', 'Jio Mobile Recharge']
];

function fallbackMerchant(lowerText: string): string {
  for (const [keyword, label] of KNOWN_MERCHANT_HINTS) {
    if (lowerText.includes(keyword)) return label;
  }
  return 'Other Transaction';
}

const UPI_ID_REGEX = /\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}\b/;
const ACCOUNT_LAST_DIGITS_REGEX = /(?:a\/?c(?:count)?(?:\s*no\.?)?|card(?:\s*no\.?)?)\s*(?:ending(?:\s*with)?)?\s*[:\-]?\s*[*xX]*(\d{3,6})\b/i;
const REFERENCE_NUMBER_REGEX = /(?:Ref|RefNo|UPI Ref|Txn ID|UPI:|Ref\.No\.)\s?([0-9]{8,12})/i;
const BALANCE_REGEX = /(?:Bal|Balance|Avail Bal|Available Balance|is)[:\s]*(?:Rs\.?|INR|₹|\$)\s?([\d,]+(?:\.\d{2})?)/i;

const INCOME_KEYWORDS = ['credited', 'deposited', 'refunded', 'received', 'interest credited', 'salary'];

/**
 * Pure regex extraction over already-filtered SMS text (see
 * SmsFilterService). Deliberately does not normalize the merchant name or
 * pick a category -- those are MerchantNormalizationService's and
 * CategoryEngine's jobs, so each concern stays independently testable.
 */
export const SmsParserService = {
  parse(text: string): ParsedSmsFields | null {
    const lowerText = text.toLowerCase();

    // Requires both a currency amount AND a transaction verb -- a bank
    // message that only mentions an amount (e.g. a balance-check or EMI due
    // reminder) is not itself a completed transaction.
    if (!TRANSACTION_VERB_REGEX.test(text)) return null;

    const amtMatch = text.match(TRANSACTION_AMOUNT_REGEX);
    if (!amtMatch) return null;
    const amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    const type: TransactionType = INCOME_KEYWORDS.some((kw) => lowerText.includes(kw)) ? 'income' : 'expense';
    const currency = detectCurrency(text);
    const paymentMethod = detectPaymentMethod(lowerText);
    const bank = detectBank(lowerText, text);

    const acctMatch = text.match(ACCOUNT_LAST_DIGITS_REGEX);
    const accountLast4 = acctMatch ? acctMatch[1] : undefined;

    const upiMatch = text.match(UPI_ID_REGEX);
    const upiId = upiMatch ? upiMatch[0] : undefined;

    const receiverCandidate = extractCandidate(text, MERCHANT_PATTERNS);
    const senderCandidate = extractCandidate(text, SENDER_PATTERNS);
    const merchantRaw = receiverCandidate || senderCandidate || fallbackMerchant(lowerText);
    const receiverName = type === 'expense' ? receiverCandidate : undefined;
    const senderName = type === 'income' ? senderCandidate : undefined;

    const refMatch = text.match(REFERENCE_NUMBER_REGEX);
    const referenceNumber = refMatch ? refMatch[1] : undefined;

    const balMatch = text.match(BALANCE_REGEX);
    const balanceAfter = balMatch ? parseFloat(balMatch[1].replace(/,/g, '')) : undefined;

    let confidenceScore = 0.7;
    if (merchantRaw !== 'Other Transaction') confidenceScore += 0.1;
    if (referenceNumber) confidenceScore += 0.1;
    if (balanceAfter) confidenceScore += 0.1;

    return {
      amount,
      currency,
      type,
      paymentMethod,
      bank,
      accountLast4,
      merchantRaw,
      receiverName,
      senderName,
      upiId,
      referenceNumber,
      balanceAfter,
      confidenceScore: Math.min(confidenceScore, 1.0)
    };
  }
};
