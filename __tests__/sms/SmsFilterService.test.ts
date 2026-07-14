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
});
