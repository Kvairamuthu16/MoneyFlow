import { DeviceEventEmitter } from 'react-native';
import { initializeStorage, AppStorage } from '../../src/storage/mmkv';
import { backgroundSmsTask, TRANSACTIONS_UPDATED_EVENT } from '../../src/services/sms/backgroundSmsTask';

describe('backgroundSmsTask', () => {
  beforeEach(async () => {
    await initializeStorage();
    AppStorage.clearAll();
  });

  it('imports a single genuine bank SMS pushed by the native listener and persists it', async () => {
    await backgroundSmsTask({
      id: 'native-123',
      address: 'AD-HDFCBK',
      body: 'Rs.350 spent at Swiggy via HDFC Bank Debit Card ending 4321 on 04-07-2026.',
      timestampMs: Date.parse('2026-07-04')
    });

    const stored = AppStorage.getTransactions();
    expect(stored).toHaveLength(1);
    expect(stored[0].merchant).toBe('Swiggy');
    expect(stored[0].sourceSMSId).toBe('native-123');
    expect(AppStorage.getParsedSMSIds()).toContain('native-123');
  });

  it('emits the transactions-updated event so a foregrounded app can refresh live', async () => {
    const listener = jest.fn();
    const subscription = DeviceEventEmitter.addListener(TRANSACTIONS_UPDATED_EVENT, listener);

    await backgroundSmsTask({
      id: 'native-456',
      address: 'AD-HDFCBK',
      body: 'Rs.500 debited from A/c XX1234 towards Amazon on 10-Jul.',
      timestampMs: Date.parse('2026-07-10')
    });

    expect(listener).toHaveBeenCalledTimes(1);
    subscription.remove();
  });

  it('does not emit an update event when the message is filtered out (no transaction added)', async () => {
    const listener = jest.fn();
    const subscription = DeviceEventEmitter.addListener(TRANSACTIONS_UPDATED_EVENT, listener);

    await backgroundSmsTask({
      id: 'native-otp',
      address: 'AD-HDFCBK',
      body: '123456 is your OTP for login. Do not share.',
      timestampMs: Date.now()
    });

    expect(listener).not.toHaveBeenCalled();
    expect(AppStorage.getTransactions()).toHaveLength(0);
    subscription.remove();
  });

  it('never reprocesses the same native SMS id twice', async () => {
    const data = {
      id: 'native-dup',
      address: 'AD-HDFCBK',
      body: 'Rs.100 spent at Swiggy on 01-Jul-26.',
      timestampMs: Date.parse('2026-07-01')
    };

    await backgroundSmsTask(data);
    await backgroundSmsTask(data);

    expect(AppStorage.getTransactions()).toHaveLength(1);
  });

  it('respects the privacy setting for raw SMS storage', async () => {
    await backgroundSmsTask({
      id: 'native-privacy',
      address: 'AD-HDFCBK',
      body: 'Rs.100 spent at Swiggy on 01-Jul-26.',
      timestampMs: Date.parse('2026-07-01')
    });

    expect(AppStorage.getTransactions()[0].sourceText).toBeUndefined();
  });
});
