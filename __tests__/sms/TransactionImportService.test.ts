import { initializeStorage, AppStorage } from '../../src/storage/mmkv';
import { TransactionImportService } from '../../src/services/sms/TransactionImportService';
import { LearningService } from '../../src/services/sms/LearningService';
import { RawSmsMessage } from '../../src/services/sms/types';

function msg(overrides: Partial<RawSmsMessage>): RawSmsMessage {
  return { id: '1', address: 'AD-HDFCBK', body: '', date: Date.parse('2026-07-10'), ...overrides };
}

describe('TransactionImportService', () => {
  beforeEach(async () => {
    await initializeStorage();
    AppStorage.clearAll();
  });

  it('imports a genuine bank debit and fills in every field the pipeline is responsible for', async () => {
    const messages = [msg({ id: 'sms-1', body: 'Rs.350 spent at Swiggy via HDFC Bank Debit Card ending 4321 on 04-07-2026. Avail Bal: Rs 49,650.00' })];

    const outcome = await TransactionImportService.importMessages(messages, [], new Set());

    expect(outcome.newTransactions).toHaveLength(1);
    expect(outcome.failed).toBe(0);
    expect(outcome.skippedFiltered).toBe(0);
    expect(outcome.skippedDuplicates).toBe(0);

    const tx = outcome.newTransactions[0];
    expect(tx.merchant).toBe('Swiggy');
    expect(tx.category).toBe('Food');
    expect(tx.amount).toBe(350);
    expect(tx.accountLast4).toBe('4321');
    expect(tx.sourceSMSId).toBe('sms-1');
  });

  it('filters out an OTP message without creating a transaction', async () => {
    const messages = [msg({ id: 'sms-otp', body: '123456 is your OTP for login. Do not share.' })];
    const outcome = await TransactionImportService.importMessages(messages, [], new Set());

    expect(outcome.newTransactions).toHaveLength(0);
    expect(outcome.skippedFiltered).toBe(1);
    expect(outcome.newlyParsedIds).toContain('sms-otp');
  });

  it('filters out a promotional message from a plain phone-number sender', async () => {
    const messages = [msg({ id: 'sms-friend', address: '+919876543210', body: 'Sent Rs.500 to Raju via GPay' })];
    const outcome = await TransactionImportService.importMessages(messages, [], new Set());

    expect(outcome.newTransactions).toHaveLength(0);
    expect(outcome.skippedFiltered).toBe(1);
  });

  it('never reprocesses a message ID that was already parsed', async () => {
    const messages = [msg({ id: 'sms-1', body: 'Rs.350 spent at Swiggy on 04-07-2026.' })];
    const outcome = await TransactionImportService.importMessages(messages, [], new Set(['sms-1']));

    expect(outcome.newTransactions).toHaveLength(0);
    expect(outcome.newlyParsedIds).toHaveLength(0);
  });

  it('skips a genuine duplicate transaction reported by two different messages (e.g. bank SMS + UPI app SMS)', async () => {
    const sameMomentBody = ['Sent Rs.80.00', 'From HDFC Bank A/C *9892', 'To BISMI STORES', 'On 13/07/26', 'Ref 864073759891'].join('\n');
    const timestamp = Date.parse('2026-07-13');

    const firstOutcome = await TransactionImportService.importMessages([msg({ id: 'sms-bank', date: timestamp, body: sameMomentBody })], [], new Set());
    expect(firstOutcome.newTransactions).toHaveLength(1);

    const secondOutcome = await TransactionImportService.importMessages(
      [msg({ id: 'sms-upi-app', date: timestamp, body: sameMomentBody })],
      firstOutcome.newTransactions,
      new Set()
    );

    expect(secondOutcome.newTransactions).toHaveLength(0);
    expect(secondOutcome.skippedDuplicates).toBe(1);
    expect(secondOutcome.newlyParsedIds).toContain('sms-upi-app');
  });

  it('applies a learned merchant->category correction during import', async () => {
    LearningService.recordCorrection('Amazon', 'Office Expense');

    const messages = [msg({ id: 'sms-amzn', body: 'Rs.1250 debited towards Amazon on 10-Jul. Ref 998877665544' })];
    const outcome = await TransactionImportService.importMessages(messages, [], new Set());

    expect(outcome.newTransactions).toHaveLength(1);
    expect(outcome.newTransactions[0].category).toBe('Office Expense');
  });
});
