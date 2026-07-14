import { MMKV } from 'react-native-mmkv';
import { Transaction, Budget, SmartInsight, AppSettings, BackupPayload } from '../types';
import { getOrCreateStorageKey } from './secureKey';

let storage: MMKV | undefined;
let initPromise: Promise<void> | undefined;

/**
 * Fetches (or generates) the real encryption key from the platform Keychain
 * and opens the MMKV instance with it. Must be awaited once during app
 * bootstrap (see AppGate) before any AppStorage method is called.
 */
export function initializeStorage(): Promise<void> {
  if (!initPromise) {
    initPromise = getOrCreateStorageKey().then((encryptionKey) => {
      storage = new MMKV({ id: 'moneyflow-ai-storage', encryptionKey });
    });
  }
  return initPromise;
}

function getStorage(): MMKV {
  if (!storage) {
    throw new Error(
      'Storage accessed before initializeStorage() resolved. Await initializeStorage() during app bootstrap before rendering any screen that touches AppStorage.'
    );
  }
  return storage;
}

export const StorageKeys = {
  TRANSACTIONS: 'moneyflow_transactions',
  BUDGETS: 'moneyflow_budgets',
  INSIGHTS: 'moneyflow_insights',
  SETTINGS: 'moneyflow_settings',
  PARSED_SMS_IDS: 'moneyflow_parsed_sms_ids',
  ONBOARDED: 'moneyflow_onboarded',
  MERCHANT_CATEGORY_OVERRIDES: 'moneyflow_merchant_category_overrides',
  LAST_SYNCED_AT: 'moneyflow_last_synced_at'
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  currency: 'INR',
  smsPermissionGranted: false,
  selectedMonth: currentYearMonth(),
  biometricLockEnabled: false
};

// A starter set of budget categories so the Budgets screen isn't empty on
// first launch. Limits are reasonable defaults for an Indian household;
// spent is always recomputed from real transactions, never trusted from here.
//
// Category names here MUST match what CategoryEngine.categorize()
// (src/services/sms/CategoryEngine.ts) actually produces -- otherwise parsed
// transactions silently never count against any budget.
export const SEED_BUDGETS: Budget[] = [
  { category: 'Food', limit: 8000, spent: 0 },
  { category: 'Groceries', limit: 6000, spent: 0 },
  { category: 'Fuel', limit: 3000, spent: 0 },
  { category: 'Utilities', limit: 5000, spent: 0 },
  { category: 'Shopping', limit: 5000, spent: 0 },
  { category: 'Entertainment', limit: 2000, spent: 0 },
  { category: 'Other', limit: 3000, spent: 0 }
];

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Parses JSON safely, returning `fallback` instead of throwing on corrupt/missing data. */
function safeParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeGet<T>(key: string, fallback: T): T {
  return safeParse(getStorage().getString(key), fallback);
}

function safeSet(key: string, value: unknown): void {
  getStorage().set(key, JSON.stringify(value));
}

export const AppStorage = {
  // Save/Get Transactions
  saveTransactions: (txs: Transaction[]): void => {
    safeSet(StorageKeys.TRANSACTIONS, txs);
  },
  getTransactions: (): Transaction[] => {
    return safeGet<Transaction[]>(StorageKeys.TRANSACTIONS, []);
  },

  // Save/Get Budgets
  saveBudgets: (budgets: Budget[]): void => {
    safeSet(StorageKeys.BUDGETS, budgets);
  },
  getBudgets: (): Budget[] => {
    const hasOnboarded = getStorage().getBoolean(StorageKeys.ONBOARDED);
    const budgets = safeGet<Budget[] | null>(StorageKeys.BUDGETS, null as unknown as Budget[]);
    if (budgets && budgets.length > 0) return budgets;
    if (!hasOnboarded) {
      AppStorage.saveBudgets(SEED_BUDGETS);
      return SEED_BUDGETS;
    }
    return [];
  },

  // Save/Get Insights
  saveInsights: (insights: SmartInsight[]): void => {
    safeSet(StorageKeys.INSIGHTS, insights);
  },
  getInsights: (): SmartInsight[] => {
    return safeGet<SmartInsight[]>(StorageKeys.INSIGHTS, []);
  },

  // Save/Get Settings
  saveSettings: (settings: AppSettings): void => {
    safeSet(StorageKeys.SETTINGS, settings);
  },
  getSettings: (): AppSettings => {
    const stored = safeGet<Partial<AppSettings> | null>(StorageKeys.SETTINGS, null);
    // Merge with defaults so newly-added settings fields (e.g. after an app
    // update) always have a sane value even for existing installs.
    return { ...DEFAULT_SETTINGS, ...(stored || {}) };
  },

  // Track already parsed SMS IDs to prevent duplicates
  saveParsedSMSIds: (ids: string[]): void => {
    safeSet(StorageKeys.PARSED_SMS_IDS, ids);
  },
  getParsedSMSIds: (): string[] => {
    return safeGet<string[]>(StorageKeys.PARSED_SMS_IDS, []);
  },

  // Mark first-run onboarding as complete (stops re-seeding default budgets
  // after the user has deleted them all intentionally).
  markOnboarded: (): void => {
    getStorage().set(StorageKeys.ONBOARDED, true);
  },

  // Merchant -> category corrections the user has made, so the category
  // engine can auto-apply them to future transactions from the same merchant.
  getMerchantOverrides: (): Record<string, string> => {
    return safeGet<Record<string, string>>(StorageKeys.MERCHANT_CATEGORY_OVERRIDES, {});
  },
  saveMerchantOverrides: (overrides: Record<string, string>): void => {
    safeSet(StorageKeys.MERCHANT_CATEGORY_OVERRIDES, overrides);
  },

  // Cursor for incremental SMS sync -- lets a broad "all time" refresh skip
  // straight to messages newer than the last successful sync instead of
  // re-reading (and re-skipping, by ID) the entire inbox every time.
  getLastSyncedAt: (): number | undefined => {
    return safeGet<number | undefined>(StorageKeys.LAST_SYNCED_AT, undefined);
  },
  saveLastSyncedAt: (timestamp: number): void => {
    safeSet(StorageKeys.LAST_SYNCED_AT, timestamp);
  },

  // Export everything into a single portable JSON payload.
  exportBackup: (): BackupPayload => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: AppStorage.getSettings(),
      transactions: AppStorage.getTransactions(),
      budgets: AppStorage.getBudgets()
    };
  },

  // Restore from a previously exported backup payload. Returns false (and
  // does not touch storage) if the payload doesn't look like a valid backup.
  importBackup: (payload: unknown): boolean => {
    if (
      !payload ||
      typeof payload !== 'object' ||
      !Array.isArray((payload as BackupPayload).transactions) ||
      !Array.isArray((payload as BackupPayload).budgets)
    ) {
      return false;
    }
    const backup = payload as BackupPayload;
    AppStorage.saveTransactions(backup.transactions);
    AppStorage.saveBudgets(backup.budgets);
    if (backup.settings) {
      AppStorage.saveSettings({ ...DEFAULT_SETTINGS, ...backup.settings });
    }
    AppStorage.markOnboarded();
    return true;
  },

  // Clear all data (Factory Reset)
  clearAll: (): void => {
    getStorage().clearAll();
  }
};
