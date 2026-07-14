/**
 * Collapses the many raw spellings a bank/UPI SMS uses for the same merchant
 * (e.g. "AMZN", "AMAZON PAY", "amazon seller") into one canonical name, so
 * reports and category learning both key off a single identity per merchant.
 */
const MERCHANT_ALIASES: Record<string, string[]> = {
  Amazon: ['amzn', 'amazon pay', 'amazon seller', 'amazon.in', 'amazon'],
  Flipkart: ['flipkart', 'fkrt'],
  Myntra: ['myntra'],
  Ajio: ['ajio'],
  Swiggy: ['swiggy'],
  Zomato: ['zomato'],
  Uber: ['uber'],
  Ola: ['ola cabs', 'olacabs', ' ola '],
  Blinkit: ['blinkit', 'grofers'],
  Zepto: ['zepto'],
  DMart: ['dmart', 'd-mart', 'avenue supermart'],
  BigBasket: ['bigbasket', 'big basket'],
  Reliance: ['reliance fresh', 'reliance digital', 'reliance retail', 'reliance'],
  Starbucks: ['starbucks'],
  Netflix: ['netflix'],
  Spotify: ['spotify'],
  'Hotstar/Disney+': ['hotstar', 'disney+'],
  BookMyShow: ['bookmyshow', 'bms'],
  IRCTC: ['irctc'],
  MakeMyTrip: ['makemytrip', 'make-my-trip', 'mmt'],
  Goibibo: ['goibibo'],
  Ixigo: ['ixigo'],
  PhonePe: ['phonepe'],
  'Google Pay': ['google pay', 'gpay', 'g-pay'],
  Paytm: ['paytm'],
  CRED: ['cred'],
  Jio: ['jio', 'reliance jio'],
  Airtel: ['airtel'],
  'Vodafone-Idea': ['vodafone idea', ' vi ', 'vodafone'],
  BESCOM: ['bescom'],
  Apollo: ['apollo']
};

export function normalizeMerchant(raw: string): string {
  const query = ` ${raw.toLowerCase()} `;
  for (const [canonical, aliases] of Object.entries(MERCHANT_ALIASES)) {
    if (aliases.some((alias) => query.includes(alias))) {
      return canonical;
    }
  }
  return raw.trim();
}

export const MerchantNormalizationService = { normalize: normalizeMerchant };
