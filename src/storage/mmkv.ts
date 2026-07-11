import { MMKV } from 'react-native-mmkv';
import { Transaction, Budget, SmartInsight, AppSettings } from '../types';

export const storage = new MMKV({
  id: 'moneyflow-ai-storage',
  encryptionKey: 'moneyflow-secure-key-offline'
});

export const StorageKeys = {
  TRANSACTIONS: 'moneyflow_transactions',
  BUDGETS: 'moneyflow_budgets',
  INSIGHTS: 'moneyflow_insights',
  SETTINGS: 'moneyflow_settings',
  PARSED_SMS_IDS: 'moneyflow_parsed_sms_ids'
};

export const AppStorage = {
  // Save/Get Transactions
  saveTransactions: (txs: Transaction[]): void => {
    storage.set(StorageKeys.TRANSACTIONS, JSON.stringify(txs));
  },
  getTransactions: (): Transaction[] => {
    const data = storage.getString(StorageKeys.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  // Save/Get Budgets
  saveBudgets: (budgets: Budget[]): void => {
    storage.set(StorageKeys.BUDGETS, JSON.stringify(budgets));
  },
  getBudgets: (): Budget[] => {
    const data = storage.getString(StorageKeys.BUDGETS);
    return data ? JSON.parse(data) : [];
  },

  // Save/Get Insights
  saveInsights: (insights: SmartInsight[]): void => {
    storage.set(StorageKeys.INSIGHTS, JSON.stringify(insights));
  },
  getInsights: (): SmartInsight[] => {
    const data = storage.getString(StorageKeys.INSIGHTS);
    return data ? JSON.parse(data) : [];
  },

  // Save/Get Settings
  saveSettings: (settings: AppSettings): void => {
    storage.set(StorageKeys.SETTINGS, JSON.stringify(settings));
  },
  getSettings: (): AppSettings => {
    const data = storage.getString(StorageKeys.SETTINGS);
    const defaultSettings: AppSettings = {
      theme: 'dark',
      currency: 'INR',
      smsPermissionGranted: false,
      selectedMonth: '2026-07'
    };
    return data ? JSON.parse(data) : defaultSettings;
  },

  // Track already parsed SMS IDs to prevent duplicates
  saveParsedSMSIds: (ids: string[]): void => {
    storage.set(StorageKeys.PARSED_SMS_IDS, JSON.stringify(ids));
  },
  getParsedSMSIds: (): string[] => {
    const data = storage.getString(StorageKeys.PARSED_SMS_IDS);
    return data ? JSON.parse(data) : [];
  },

  // Clear all data (Factory Reset)
  clearAll: (): void => {
    storage.clearAll();
  }
};
