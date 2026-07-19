import { SmsParserService } from '../../src/services/sms/SmsParserService';

describe('SmsParserService', () => {
  it('parses a multi-line "Sent/From/To/On/Ref" UPI debit alert (HDFC)', () => {
    const text = ['Sent Rs.80.00', 'From HDFC Bank A/C *9892', 'To BISMI STORES', 'On 13/07/26', 'Ref 864073759891', 'Not You?', 'Call 18002586161/SMS BLOCK UPI to 7308080808'].join(
      '\n'
    );

    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(80);
    expect(parsed?.currency).toBe('INR');
    expect(parsed?.merchantRaw).toBe('BISMI STORES');
    expect(parsed?.bank).toBe('HDFC');
    expect(parsed?.accountLast4).toBe('9892');
    expect(parsed?.type).toBe('expense');
    expect(parsed?.status).toBe('success');
    expect(parsed?.referenceNumber).toBe('864073759891');
  });

  it('parses the classic "spent at X via debit card" phrasing, distinguishing the card digits from an account', () => {
    const text = 'Rs.350 spent at Swiggy via HDFC Bank Debit Card ending 4321 on 04-07-2026. Avail Bal: Rs 49,650.00';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.merchantRaw).toBe('Swiggy');
    expect(parsed?.amount).toBe(350);
    expect(parsed?.cardLast4).toBe('4321');
    expect(parsed?.accountLast4).toBeUndefined();
    expect(parsed?.paymentMethod).toBe('Debit Card');
    expect(parsed?.balanceAfter).toBe(49650);
  });

  it('parses an ICICI card POS payment', () => {
    const text = 'Rs 799.00 spent on ICICI Bank Card XX3456 at AMAZON on 12-Jul-26. Avl Lmt: Rs 45,000.00';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(799);
    expect(parsed?.bank).toBe('ICICI');
    expect(parsed?.cardLast4).toBe('3456');
    expect(parsed?.merchantRaw.toLowerCase()).toContain('amazon');
    expect(parsed?.type).toBe('expense');
  });

  it('parses an SBI salary credit', () => {
    const text = 'Your A/c XX1234 is credited with Rs.55,000.00 on 01-Jul-26 by SALARY-ACME CORP. Avl Bal Rs.61,200.00 -SBI';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(55000);
    expect(parsed?.bank).toBe('SBI');
    expect(parsed?.accountLast4).toBe('1234');
    expect(parsed?.type).toBe('income');
    expect(parsed?.balanceAfter).toBe(61200);
  });

  it('parses an Axis Bank UPI debit with a VPA as the payee (not payer, since this is an expense)', () => {
    const text = 'Rs.250.00 debited from A/c no. XX5678 on 05-Jul-26 to VPA merchant@okaxis. UPI Ref 998877665544. -Axis Bank';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(250);
    expect(parsed?.bank).toBe('AXIS');
    expect(parsed?.accountLast4).toBe('5678');
    expect(parsed?.upiId).toBe('merchant@okaxis');
    expect(parsed?.payeeUpiId).toBe('merchant@okaxis');
    expect(parsed?.payerUpiId).toBeUndefined();
    expect(parsed?.paymentMethod).toBe('UPI');
    expect(parsed?.referenceNumber).toBe('998877665544');
  });

  it('parses a Kotak IMPS transfer', () => {
    const text = 'Rs 15,000.00 transferred via IMPS to A/c XX9988 Ref 776655443322 from your Kotak A/c XX4433 on 09-Jul-26.';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(15000);
    expect(parsed?.bank).toBe('KOTAK');
    expect(parsed?.paymentMethod).toBe('IMPS');
    expect(parsed?.referenceNumber).toBe('776655443322');
  });

  it('parses a Paytm wallet load', () => {
    const text = 'Rs.500 added to your Paytm Wallet on 03-Jul-26. Ref 665544332211';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(500);
    expect(parsed?.bank).toBe('PAYTM');
    expect(parsed?.paymentMethod).toBe('Wallet');
  });

  it('extracts a UTR number distinct from a generic reference number', () => {
    const text = 'Rs.5,000.00 credited to your A/c XX1122 via NEFT. UTR: 123456789012. -HDFC Bank';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.paymentMethod).toBe('NEFT');
    expect(parsed?.utrNumber).toBe('123456789012');
  });

  it('extracts the payer UPI id and mobile number for a received UPI credit', () => {
    const text = 'Rs.150.00 received from 9876543210@ybl on 06-Jul-26 in your HDFC A/c XX9892. Ref 112233445566';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('income');
    expect(parsed?.payerUpiId).toBe('9876543210@ybl');
    expect(parsed?.payeeUpiId).toBeUndefined();
    expect(parsed?.mobileNumber).toBe('9876543210');
  });

  it('detects a failed transaction', () => {
    const text = 'Your payment of Rs.500 to Amazon has failed. Amount will be reversed to your account. -ICICI Bank';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe('failed');
  });

  it('detects a pending transaction', () => {
    const text = 'Rs.1,000 debited for NEFT transfer, transaction is pending and will be credited to beneficiary shortly. -SBI';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe('pending');
  });

  it('returns null when there is no recognizable amount', () => {
    expect(SmsParserService.parse('Hey, are we still on for lunch tomorrow?')).toBeNull();
  });

  it('returns null for an amount-only balance-check message with no transaction verb', () => {
    expect(SmsParserService.parse('Your account balance as of today is Rs.12,340.00. -HDFC Bank')).toBeNull();
  });

  it('falls back to the sender address to identify the bank when the message body never names it', () => {
    // A common real-world template: the body says nothing about which bank
    // sent it -- only the sender ID (e.g. "VM-HDFCBK") does.
    const text = 'Rs.500.00 debited from A/c XX1234 towards Amazon on 12-Jul-26. Avl Bal Rs.5,000.00';
    const parsed = SmsParserService.parse(text, 'VM-HDFCBK');

    expect(parsed).not.toBeNull();
    expect(parsed?.bank).toBe('HDFC');
  });

  it('still prefers a bank name mentioned in the body over the sender address', () => {
    const text = 'Rs.500.00 debited from A/c XX1234 towards Amazon via SBI on 12-Jul-26.';
    const parsed = SmsParserService.parse(text, 'VM-HDFCBK');

    expect(parsed?.bank).toBe('SBI');
  });

  it('matches a multi-word bank keyword against a compact sender address', () => {
    const text = 'Rs.500.00 debited from A/c XX1234 towards Amazon on 12-Jul-26.';
    const parsed = SmsParserService.parse(text, 'AD-YESBANK');

    expect(parsed?.bank).toBe('YES BANK');
  });

  it('still returns Unknown Bank when neither the body nor the address identifies one', () => {
    const text = 'Rs.500.00 debited from A/c XX1234 towards Amazon on 12-Jul-26.';
    const parsed = SmsParserService.parse(text, 'AD-XYZABC');

    expect(parsed?.bank).toBe('Unknown Bank');
  });
});
