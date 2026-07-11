import { Transaction, PaymentMethod, TransactionType } from '../types';

// Category mapping helper based on merchant name keywords
export function autoCategorize(merchant: string, text: string): string {
  const query = `${merchant} ${text}`.toLowerCase();

  if (query.includes('swiggy') || query.includes('zomato') || query.includes('food') || query.includes('restaurant') || query.includes('cafe') || query.includes('mcdonald') || query.includes('starbucks')) {
    return 'Food';
  }
  if (query.includes('blinkit') || query.includes('zepto') || query.includes('instamart') || query.includes('grocery') || query.includes('groceries') || query.includes('supermarket') || query.includes('dmart')) {
    return 'Groceries';
  }
  if (query.includes('hospital') || query.includes('pharmacy') || query.includes('medical') || query.includes('chemist') || query.includes('apollo') || query.includes('dentist')) {
    return 'Medical';
  }
  if (query.includes('hpcl') || query.includes('bpcl') || query.includes('petrol') || query.includes('fuel') || query.includes('shell') || query.includes('gas station')) {
    return 'Fuel';
  }
  if (query.includes('uber') || query.includes('ola') || query.includes('rapido') || query.includes('metro') || query.includes('rail') || query.includes('flight') || query.includes('irctc') || query.includes('indigo') || query.includes('make-my-trip')) {
    return 'Travel';
  }
  if (query.includes('myntra') || query.includes('amazon') || query.includes('flipkart') || query.includes('ajio') || query.includes('clothing') || query.includes('shopping') || query.includes('apparel') || query.includes('decathlon')) {
    return 'Shopping';
  }
  if (query.includes('netflix') || query.includes('spotify') || query.includes('hotstar') || query.includes('bookmyshow') || query.includes('pvr') || query.includes('cinema') || query.includes('game') || query.includes('gaming')) {
    return 'Entertainment';
  }
  if (query.includes('electricity') || query.includes('water bill') || query.includes('bescom') || query.includes('tneb') || query.includes('gas bill') || query.includes('piped gas')) {
    return 'Utilities';
  }
  if (query.includes('recharge') || query.includes('jio') || query.includes('airtel') || query.includes('vi ') || query.includes('telecom') || query.includes('broadband') || query.includes('internet') || query.includes('act fibernet')) {
    return 'Internet';
  }
  if (query.includes('lic ') || query.includes('insurance') || query.includes('hdfc ergo') || query.includes('policybazaar')) {
    return 'Insurance';
  }
  if (query.includes('rent') || query.includes('landlord') || query.includes('broker') || query.includes('housing')) {
    return 'Rent';
  }
  if (query.includes('loan') || query.includes('emi') || query.includes('finance') || query.includes('cred ') || query.includes('repayment')) {
    return 'EMI';
  }
  if (query.includes('salary') || query.includes('payroll') || query.includes('credited from') || query.includes('employer')) {
    return 'Salary';
  }
  if (query.includes('zerodha') || query.includes('groww') || query.includes('mutual fund') || query.includes('sip') || query.includes('etmoney') || query.includes('investment') || query.includes('stock')) {
    return 'Investment';
  }
  if (query.includes('tuition') || query.includes('school') || query.includes('college') || query.includes('udemy') || query.includes('coursera') || query.includes('education')) {
    return 'Education';
  }
  if (query.includes('cash withdrawal') || query.includes('atm') || query.includes('cash dispensed')) {
    return 'Cash';
  }
  if (query.includes('phonepe') || query.includes('gpay') || query.includes('paytm') || query.includes('upi')) {
    return 'Transfer';
  }

  return 'Other';
}

// Smart local parser class
export class SmartOfflineSMSParser {
  /**
   * Main function to parse a raw banking text message.
   * Leverages regex engines optimized for Indian and global SMS formats.
   */
  static parseSMS(id: string, text: string, timestamp: number): Transaction | null {
    const lowerText = text.toLowerCase();

    // 1. Skip non-banking messages like OTP, Spam, Promotional
    if (
      lowerText.includes('otp') ||
      lowerText.includes('one time password') ||
      lowerText.includes('verification code') ||
      lowerText.includes('win cash') ||
      lowerText.includes('loan offer') ||
      lowerText.includes('pre-approved') ||
      lowerText.includes('scratch card') ||
      lowerText.includes('spam') ||
      lowerText.includes('discount coupon') ||
      lowerText.includes('invest now to earn')
    ) {
      return null;
    }

    // Must have transactional keywords
    const isTx = 
      lowerText.includes('spent') ||
      lowerText.includes('debited') ||
      lowerText.includes('charged') ||
      lowerText.includes('withdrawn') ||
      lowerText.includes('credited') ||
      lowerText.includes('deposited') ||
      lowerText.includes('sent') ||
      lowerText.includes('received') ||
      lowerText.includes('txn') ||
      lowerText.includes('payment to') ||
      lowerText.includes('transfer of') ||
      lowerText.includes('paid to') ||
      lowerText.includes('added to wallet');

    if (!isTx) return null;

    // 2. Identify transaction amount
    // Matches patterns like Rs.350, Rs 350, INR 850, INR.1200, USD 40, $40, €18.20, ₹ 500
    const amtRegex = /(?:Rs\.?|INR|INR\.?|₹|USD|\$|EUR|£|pocket)\s?([\d,]+(?:\.\d{2})?)/i;
    const amtMatch = text.match(amtRegex);
    if (!amtMatch) return null;
    const amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    // 3. Determine transaction type (income vs expense)
    let type: TransactionType = 'expense';
    if (
      lowerText.includes('credited') ||
      lowerText.includes('deposited') ||
      lowerText.includes('refunded') ||
      lowerText.includes('received') ||
      lowerText.includes('cashback') ||
      lowerText.includes('interest credited') ||
      lowerText.includes('salary')
    ) {
      type = 'income';
    }

    // 4. Determine Payment Method
    let paymentMethod: PaymentMethod = 'Other';
    if (lowerText.includes('upi') || lowerText.includes('gpay') || lowerText.includes('phonepe') || lowerText.includes('paytm upi')) {
      paymentMethod = 'UPI';
    } else if (lowerText.includes('atm') || lowerText.includes('withdrawn from atm') || lowerText.includes('cash dispensed')) {
      paymentMethod = 'ATM';
    } else if (lowerText.includes('cash') || lowerText.includes('hand cash')) {
      paymentMethod = 'Cash';
    } else if (lowerText.includes('credit card') || lowerText.includes('cc ending') || (lowerText.includes('card ending') && lowerText.includes('cc'))) {
      paymentMethod = 'Credit Card';
    } else if (lowerText.includes('debit card') || lowerText.includes('dc ending') || lowerText.includes('card ending')) {
      paymentMethod = 'Debit Card';
    } else if (lowerText.includes('wallet') || lowerText.includes('paytm wallet') || lowerText.includes('amazon pay')) {
      paymentMethod = 'Wallet';
    } else if (lowerText.includes('neft') || lowerText.includes('rtgs') || lowerText.includes('imps') || lowerText.includes('bank transfer')) {
      paymentMethod = 'Bank Transfer';
    }

    // 5. Extract Bank Name
    let bank = 'Unknown Bank';
    const bankKeywords = [
      'hdfc', 'sbi', 'icici', 'axis', 'kotak', 'pnb', 'bob', 'canara', 'hsbc', 'citi', 'chase', 'wells fargo', 'revolut', 'paytm'
    ];
    for (const keyword of bankKeywords) {
      if (lowerText.includes(keyword)) {
        bank = keyword.toUpperCase();
        break;
      }
    }
    if (bank === 'Unknown Bank') {
      const shortCodeMatch = text.match(/^([A-Z]{2})-[A-Z]+/);
      if (shortCodeMatch) {
        bank = shortCodeMatch[1];
      }
    }

    // 6. Extract Merchant Name
    let merchant = 'Other Transaction';
    
    // Look for merchants after "at", "to", "info", "on", "via"
    const merchantPatterns = [
      /(?:spent at|spent on|paid to|payment to|at|info:)\s+([A-Za-z0-9\s\.\*&]+?)(?:\s+on|\s+via|\s+balance|\s+Ref|\s+RefNo|\s+with|\.|$)/i,
      /(?:credited from|received from|salary from)\s+([A-Za-z0-9\s\.\*&]+?)(?:\s+on|\s+via|\s+balance|\s+Ref|\s+with|\.|$)/i
    ];

    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate.length > 2 && candidate.length < 32 && !['upi', 'debit', 'credit', 'card', 'account', 'ref', 'vpa'].includes(candidate.toLowerCase())) {
          merchant = candidate;
          break;
        }
      }
    }

    if (merchant === 'Other Transaction') {
      if (lowerText.includes('swiggy')) merchant = 'Swiggy';
      else if (lowerText.includes('zomato')) merchant = 'Zomato';
      else if (lowerText.includes('blinkit')) merchant = 'Blinkit';
      else if (lowerText.includes('netflix')) merchant = 'Netflix';
      else if (lowerText.includes('spotify')) merchant = 'Spotify';
      else if (lowerText.includes('amazon')) merchant = 'Amazon';
      else if (lowerText.includes('flipkart')) merchant = 'Flipkart';
      else if (lowerText.includes('uber')) merchant = 'Uber';
      else if (lowerText.includes('ola')) merchant = 'Ola';
      else if (lowerText.includes('cred')) merchant = 'CRED Bill Payment';
      else if (lowerText.includes('bescom')) merchant = 'BESCOM';
      else if (lowerText.includes('jio')) merchant = 'Jio Mobile Recharge';
    }

    // 7. Extract Reference Number / UPI Ref
    let referenceNumber: string | undefined;
    const refMatch = text.match(/(?:Ref|RefNo|UPI Ref|Txn ID|UPI:|Ref\.No\.)\s?([0-9]{8,12})/i);
    if (refMatch) {
      referenceNumber = refMatch[1];
    }

    // 8. Extract Balance after Transaction
    let balanceAfter: number | undefined;
    const balMatch = text.match(/(?:Bal|Balance|Avail Bal|Available Balance|is)\s?(?:Rs\.?|INR|₹|\$)\s?([\d,]+(?:\.\d{2})?)/i);
    if (balMatch) {
      balanceAfter = parseFloat(balMatch[1].replace(/,/g, ''));
    }

    // 9. Format Date and Time from message timestamp
    const dateObj = new Date(timestamp);
    const date = dateObj.toISOString().split('T')[0];
    const time = dateObj.toTimeString().split(' ')[0].substring(0, 5);

    // 10. Automatically categorize
    const category = type === 'income' ? 'Salary' : autoCategorize(merchant, text);

    // Calculate Confidence Score
    let confidenceScore = 0.7; // baseline
    if (merchant !== 'Other Transaction') confidenceScore += 0.1;
    if (referenceNumber) confidenceScore += 0.1;
    if (balanceAfter) confidenceScore += 0.1;

    return {
      id: `sms-parsed-${id}-${timestamp}`,
      amount,
      merchant,
      bank,
      date,
      time,
      type,
      paymentMethod,
      category,
      balanceAfter,
      referenceNumber,
      confidenceScore: Math.min(confidenceScore, 1.0),
      sourceSMSId: id,
      sourceText: text
    };
  }
}
