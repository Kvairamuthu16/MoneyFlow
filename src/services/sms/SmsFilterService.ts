/**
 * Pre-parse gate: decides whether a raw SMS is even worth handing to
 * SmsParserService. Runs cheap string checks before any regex extraction, so
 * OTPs / promos / delivery notifications never reach the parser.
 */

// Any of these anywhere in the body means "not a transaction" -- unconditional,
// per product spec (OTP/marketing/logistics copy never carries real payment data).
const DENY_CONTENT_KEYWORDS = [
  'otp',
  'one time password',
  'verification code',
  'login code',
  'password',
  'authentication',
  'kyc reminder',
  'offer',
  'cashback',
  'coupon',
  'sale',
  'discount',
  'loan offer',
  'credit card offer',
  'insurance',
  'delivery',
  'courier',
  'tracking',
  'ticket',
  'booking',
  'promotion',
  'subscription',
  'reward points',
  'advertisement',
  'spam',
  'pre-approved',
  'scratch card',
  'win cash',
  'invest now to earn'
];

// DLT sender-header prefixes that are shared by transactional AND promotional
// traffic alike -- by themselves they say nothing. Only combined with a known
// promotional company name do they mark a sender worth suppressing (and even
// then only absent real payment evidence in the body).
const PROMOTIONAL_SENDER_COMPANY_KEYWORDS = ['amazon', 'flipkart', 'myntra', 'swiggy', 'zomato'];

/** Amount pattern shared with SmsParserService so the filter's "real payment info" check stays in sync with what the parser can actually extract. */
export const TRANSACTION_AMOUNT_REGEX = /(?:Rs\.?|INR|INR\.?|₹|USD|\$|EUR|£)\s?([\d,]+(?:\.\d{2})?)/i;

export const TRANSACTION_VERB_REGEX =
  /\b(spent|debited|charged|withdrawn|credited|deposited|sent|received|txn|payment to|transferred|transfer of|paid to|added to)\b/i;

export function hasStrongTransactionSignal(text: string): boolean {
  return TRANSACTION_AMOUNT_REGEX.test(text) && TRANSACTION_VERB_REGEX.test(text);
}

function containsDenyKeyword(lowerText: string): boolean {
  return DENY_CONTENT_KEYWORDS.some((kw) => lowerText.includes(kw));
}

/**
 * Banks/DLT gateways always send transactional SMS from a short alphanumeric
 * sender ID (e.g. "HDFCBK", "AD-ICICIB"), never a plain mobile number. A
 * message from a 7-15 digit number is a person texting, not a bank -- even if
 * it happens to mention "sent"/"received" (e.g. a friend confirming a UPI
 * transfer).
 */
export function isLikelyBankSender(address?: string): boolean {
  if (!address) return true; // unknown sender -- fall back to content-based filtering only
  const looksLikePhoneNumber = /^\+?\d{7,15}$/.test(address.trim().replace(/[\s\-]/g, ''));
  return !looksLikePhoneNumber;
}

function isPromotionalCompanySender(address?: string): boolean {
  if (!address) return false;
  const lowerAddress = address.toLowerCase();
  return PROMOTIONAL_SENDER_COMPANY_KEYWORDS.some((kw) => lowerAddress.includes(kw));
}

export interface SmsFilterDecision {
  shouldProcess: boolean;
  reason?: 'phone-sender' | 'deny-keyword' | 'promotional-sender';
}

export const SmsFilterService = {
  evaluate(address: string | undefined, body: string): SmsFilterDecision {
    if (!isLikelyBankSender(address)) {
      return { shouldProcess: false, reason: 'phone-sender' };
    }

    const lowerBody = body.toLowerCase();
    if (containsDenyKeyword(lowerBody)) {
      return { shouldProcess: false, reason: 'deny-keyword' };
    }

    if (isPromotionalCompanySender(address) && !hasStrongTransactionSignal(body)) {
      return { shouldProcess: false, reason: 'promotional-sender' };
    }

    return { shouldProcess: true };
  },

  shouldProcess(address: string | undefined, body: string): boolean {
    return SmsFilterService.evaluate(address, body).shouldProcess;
  }
};
