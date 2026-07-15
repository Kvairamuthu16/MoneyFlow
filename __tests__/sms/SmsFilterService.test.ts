import { SmsFilterService, isLikelyBankSender } from '../../src/services/sms/SmsFilterService';

describe('SmsFilterService', () => {
  it('accepts a genuine bank debit alert from a DLT sender ID', () => {
    expect(SmsFilterService.shouldProcess('AD-HDFCBK', 'Rs.500 debited from A/c XX1234 towards Amazon on 10-Jul.')).toBe(true);
  });

  it('rejects an OTP message even from a bank sender', () => {
    expect(SmsFilterService.shouldProcess('AD-HDFCBK', '123456 is your OTP for login. Do not share with anyone.')).toBe(false);
  });

  it('rejects a promotional/cashback offer message', () => {
    expect(SmsFilterService.shouldProcess('AD-SWIGGY', 'Get 20% cashback on your next Swiggy order! Use code SWIGGY20.')).toBe(false);
  });

  it('rejects a delivery/courier tracking notification', () => {
    expect(SmsFilterService.shouldProcess('AD-AMAZON', 'Your package is out for delivery and will arrive today. Track: bit.ly/xyz')).toBe(false);
  });

  it('rejects a loan/credit-card offer', () => {
    expect(SmsFilterService.shouldProcess('VM-HDFCBK', 'You are pre-approved for a personal loan offer of Rs 5,00,000. Apply now!')).toBe(false);
  });

  it('rejects a message from a plain mobile-number sender even if it sounds transactional', () => {
    expect(SmsFilterService.shouldProcess('+919876543210', 'Sent Rs.500 to Raju via GPay. Ref 123456789012')).toBe(false);
    expect(isLikelyBankSender('+919876543210')).toBe(false);
    expect(isLikelyBankSender('9876543210')).toBe(false);
  });

  it('accepts messages from short alphanumeric bank/DLT sender IDs', () => {
    expect(isLikelyBankSender('AD-HDFCBK')).toBe(true);
    expect(isLikelyBankSender('HDFCBK')).toBe(true);
    expect(isLikelyBankSender('VM-ICICIB')).toBe(true);
    expect(isLikelyBankSender(undefined)).toBe(true);
  });

  it('rejects a promotional-company sender with no real payment info, but allows one that has it', () => {
    expect(SmsFilterService.shouldProcess('AD-AMAZON', 'Amazon: Your Prime membership renews soon.')).toBe(false);
    expect(SmsFilterService.shouldProcess('AD-AMAZON', 'Rs.1250 debited towards your Amazon Pay transaction on 10-Jul. Ref 998877665544')).toBe(true);
  });

  // "cashback"/"subscription"/"insurance"/"reward points" are marketing
  // buzzwords AND real transaction types (Cashback Credit, Subscription
  // Renewal, Insurance Premium) -- soft-deny only rejects them absent real
  // payment evidence, it must not reject the genuine transaction messages.
  it('accepts a genuine cashback credit but rejects a cashback marketing offer', () => {
    expect(SmsFilterService.shouldProcess('AD-HDFCBK', 'Rs.20 cashback credited to your account for your last transaction. -HDFC Bank')).toBe(true);
    expect(SmsFilterService.shouldProcess('AD-HDFCBK', 'Get amazing cashback offers on every UPI payment this week!')).toBe(false);
  });

  it('accepts a genuine subscription renewal debit but rejects a subscribe-now promo', () => {
    expect(SmsFilterService.shouldProcess('AD-HDFCBK', 'Rs.199 debited towards your subscription renewal. -HDFC Bank')).toBe(true);
    expect(SmsFilterService.shouldProcess('AD-HDFCBK', 'Subscription plans starting at just Rs.99! Subscribe now.')).toBe(false);
  });

  it('accepts a genuine insurance premium debit but rejects an insurance sales pitch', () => {
    expect(SmsFilterService.shouldProcess('AD-HDFCBK', 'Rs.5000 debited towards your HDFC Life insurance premium. -HDFC Bank')).toBe(true);
    expect(SmsFilterService.shouldProcess('AD-HDFCBK', 'Get the best insurance plans for your family, enquire now!')).toBe(false);
  });
});
