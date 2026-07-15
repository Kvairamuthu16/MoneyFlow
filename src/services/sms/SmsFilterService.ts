import filterConfig from './config/financialKeywordFilters.json';

/**
 * Pre-parse gate: decides whether a raw SMS is even worth handing to
 * SmsParserService. Runs cheap string checks before any regex extraction, so
 * OTPs / promos / delivery notifications never reach the parser.
 *
 * All keyword lists live in ./config/financialKeywordFilters.json -- adding
 * or tuning a keyword is a data edit there, not a change to this file. See
 * docs/sms-engine-extending.md.
 */

// Unconditional: these phrases never co-occur with a genuine bank transaction
// (OTP/marketing/logistics copy never carries real payment data), so any
// match rejects the message regardless of what else it contains.
const HARD_DENY_KEYWORDS: string[] = filterConfig.hardDenyKeywords;

// Words that are STRONG marketing signals but can legitimately appear in a
// real transaction message too (a genuine cashback credit, a subscription
// renewal debit, an insurance premium debit). These only reject the message
// when there's no real amount+verb evidence alongside them.
const SOFT_DENY_KEYWORDS: string[] = filterConfig.softDenyKeywords;

// DLT sender-header prefixes that are shared by transactional AND promotional
// traffic alike -- by themselves they say nothing. Only combined with a known
// promotional company name do they mark a sender worth suppressing (and even
// then only absent real payment evidence in the body).
const PROMOTIONAL_SENDER_COMPANY_KEYWORDS: string[] = filterConfig.promotionalSenderCompanies;

/** Amount pattern shared with SmsParserService so the filter's "real payment info" check stays in sync with what the parser can actually extract. */
export const TRANSACTION_AMOUNT_REGEX = /(?:Rs\.?|INR|INR\.?|₹|USD|\$|EUR|£)\s?([\d,]+(?:\.\d{2})?)/i;

const escapedVerbs = (filterConfig.transactionVerbs as string[]).map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
export const TRANSACTION_VERB_REGEX = new RegExp(`\\b(${escapedVerbs.join('|')})\\b`, 'i');

export function hasStrongTransactionSignal(text: string): boolean {
  return TRANSACTION_AMOUNT_REGEX.test(text) && TRANSACTION_VERB_REGEX.test(text);
}

function containsAny(lowerText: string, keywords: string[]): boolean {
  return keywords.some((kw) => lowerText.includes(kw));
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
  return containsAny(address.toLowerCase(), PROMOTIONAL_SENDER_COMPANY_KEYWORDS);
}

export interface SmsFilterDecision {
  shouldProcess: boolean;
  reason?: 'phone-sender' | 'hard-deny-keyword' | 'soft-deny-keyword' | 'promotional-sender';
}

export const SmsFilterService = {
  evaluate(address: string | undefined, body: string): SmsFilterDecision {
    if (!isLikelyBankSender(address)) {
      return { shouldProcess: false, reason: 'phone-sender' };
    }

    const lowerBody = body.toLowerCase();
    if (containsAny(lowerBody, HARD_DENY_KEYWORDS)) {
      return { shouldProcess: false, reason: 'hard-deny-keyword' };
    }

    const strongSignal = hasStrongTransactionSignal(body);

    if (containsAny(lowerBody, SOFT_DENY_KEYWORDS) && !strongSignal) {
      return { shouldProcess: false, reason: 'soft-deny-keyword' };
    }

    if (isPromotionalCompanySender(address) && !strongSignal) {
      return { shouldProcess: false, reason: 'promotional-sender' };
    }

    return { shouldProcess: true };
  },

  shouldProcess(address: string | undefined, body: string): boolean {
    return SmsFilterService.evaluate(address, body).shouldProcess;
  }
};
