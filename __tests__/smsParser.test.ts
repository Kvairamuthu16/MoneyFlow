import { SmartOfflineSMSParser } from '../src/services/smsParser';

describe('SmartOfflineSMSParser', () => {
  it('extracts merchant, amount, bank and reference from a multi-line "Sent/From/To/On/Ref" UPI alert', () => {
    const text = ['Sent Rs.80.00', 'From HDFC Bank A/C *9892', 'To BISMI STORES', 'On 13/07/26', 'Ref 864073759891', 'Not You?', 'Call 18002586161/SMS BLOCK UPI to 7308080808'].join(
      '\n'
    );

    const tx = SmartOfflineSMSParser.parseSMS('test-1', text, Date.parse('2026-07-13'));

    expect(tx).not.toBeNull();
    expect(tx?.amount).toBe(80);
    expect(tx?.merchant).toBe('BISMI STORES');
    expect(tx?.bank).toBe('HDFC');
    expect(tx?.type).toBe('expense');
    expect(tx?.referenceNumber).toBe('864073759891');
  });

  it('still extracts merchant for the classic "paid to X via UPI" phrasing', () => {
    const text = 'Rs.350 spent at Swiggy via HDFC Bank Debit Card ending 4321 on 04-07-2026. Avail Bal: Rs 49,650.00';
    const tx = SmartOfflineSMSParser.parseSMS('test-2', text, Date.parse('2026-07-04'));

    expect(tx).not.toBeNull();
    expect(tx?.merchant).toBe('Swiggy');
    expect(tx?.amount).toBe(350);
  });
});
