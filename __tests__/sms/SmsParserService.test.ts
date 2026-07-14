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
    expect(parsed?.referenceNumber).toBe('864073759891');
  });

  it('parses the classic "spent at X via debit card" phrasing', () => {
    const text = 'Rs.350 spent at Swiggy via HDFC Bank Debit Card ending 4321 on 04-07-2026. Avail Bal: Rs 49,650.00';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.merchantRaw).toBe('Swiggy');
    expect(parsed?.amount).toBe(350);
    expect(parsed?.accountLast4).toBe('4321');
    expect(parsed?.paymentMethod).toBe('Debit Card');
    expect(parsed?.balanceAfter).toBe(49650);
  });

  it('parses an ICICI card POS payment', () => {
    const text = 'Rs 799.00 spent on ICICI Bank Card XX3456 at AMAZON on 12-Jul-26. Avl Lmt: Rs 45,000.00';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(799);
    expect(parsed?.bank).toBe('ICICI');
    expect(parsed?.accountLast4).toBe('3456');
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

  it('parses an Axis Bank UPI debit with a VPA', () => {
    const text = 'Rs.250.00 debited from A/c no. XX5678 on 05-Jul-26 to VPA merchant@okaxis. UPI Ref 998877665544. -Axis Bank';
    const parsed = SmsParserService.parse(text);

    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(250);
    expect(parsed?.bank).toBe('AXIS');
    expect(parsed?.accountLast4).toBe('5678');
    expect(parsed?.upiId).toBe('merchant@okaxis');
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

  it('returns null when there is no recognizable amount', () => {
    expect(SmsParserService.parse('Hey, are we still on for lunch tomorrow?')).toBeNull();
  });
});
