import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { AppStorage } from '../storage/mmkv';
import { SmsSyncWorker, SmsScanRange, ImportResult, TRANSACTIONS_UPDATED_EVENT } from '../services/sms';
import { AppSettings, BackupPayload, Budget, SmartInsight, Transaction } from '../types';
import { computeBudgetsWithSpent } from '../utils/budgets';
import { CURRENCY_SYMBOLS, CURRENCY_LOCALES, formatCurrency } from '../utils/currency';

interface AppDataContextValue {
  settings: AppSettings;
  transactions: Transaction[];
  budgets: Budget[];
  monthlyTransactions: Transaction[];
  insights: SmartInsight[];
  isSyncing: boolean;
  refresh: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setSelectedMonth: (month: string) => void;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (budget: Pick<Budget, 'category' | 'limit'>) => void;
  updateBudgetLimit: (category: string, limit: number) => void;
  deleteBudget: (category: string) => void;
  syncSms: (range?: SmsScanRange) => Promise<ImportResult>;
  exportBackup: () => BackupPayload;
  importBackup: (payload: unknown) => boolean;
  clearAllData: () => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => AppStorage.getSettings());
  const [transactions, setTransactionsState] = useState<Transaction[]>(() => AppStorage.getTransactions());
  const [budgetConfigs, setBudgetConfigsState] = useState<Budget[]>(() => AppStorage.getBudgets());
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(() => {
    setSettingsState(AppStorage.getSettings());
    setTransactionsState(AppStorage.getTransactions());
    setBudgetConfigsState(AppStorage.getBudgets());
  }, []);

  // The native real-time SMS listener (see backgroundSmsTask.ts) can import a
  // transaction while this screen is mounted but the app was backgrounded --
  // this keeps the UI in sync without waiting for the next manual refresh.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(TRANSACTIONS_UPDATED_EVENT, refresh);
    return () => subscription.remove();
  }, [refresh]);

  const budgets = useMemo(
    () => computeBudgetsWithSpent(budgetConfigs, transactions, settings.selectedMonth),
    [budgetConfigs, transactions, settings.selectedMonth]
  );

  const monthlyTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(settings.selectedMonth)),
    [transactions, settings.selectedMonth]
  );

  const insights: SmartInsight[] = useMemo(() => {
    const list: SmartInsight[] = [];
    const income = monthlyTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthlyTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    if (expense > income && income > 0) {
      list.push({
        id: 'budget-alert',
        title: 'Budget Alert',
        description: 'Your monthly expenses have exceeded your total income.',
        type: 'danger',
        timestamp: 'Just now'
      });
    }

    const overBudget = budgets.filter((b) => b.limit > 0 && b.spent / b.limit >= 1);
    if (overBudget.length > 0) {
      list.push({
        id: 'over-budget',
        title: `${overBudget.length} ${overBudget.length === 1 ? 'Category' : 'Categories'} Over Budget`,
        description: overBudget.map((b) => b.category).join(', '),
        type: 'danger',
        timestamp: 'Today'
      });
    }

    return list;
  }, [monthlyTransactions, budgets]);

  const persistSettings = useCallback((next: AppSettings) => {
    setSettingsState(next);
    AppStorage.saveSettings(next);
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      persistSettings({ ...settings, ...patch });
    },
    [settings, persistSettings]
  );

  const setSelectedMonth = useCallback(
    (month: string) => {
      persistSettings({ ...settings, selectedMonth: month });
    },
    [settings, persistSettings]
  );

  const persistTransactions = useCallback((next: Transaction[]) => {
    setTransactionsState(next);
    AppStorage.saveTransactions(next);
  }, []);

  const addTransaction = useCallback(
    (tx: Transaction) => {
      persistTransactions([tx, ...transactions]);
    },
    [transactions, persistTransactions]
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      persistTransactions(transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [transactions, persistTransactions]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      persistTransactions(transactions.filter((t) => t.id !== id));
    },
    [transactions, persistTransactions]
  );

  const persistBudgetConfigs = useCallback((next: Budget[]) => {
    setBudgetConfigsState(next);
    AppStorage.saveBudgets(next);
    AppStorage.markOnboarded();
  }, []);

  const addBudget = useCallback(
    (budget: Pick<Budget, 'category' | 'limit'>) => {
      if (budgetConfigs.some((b) => b.category.toLowerCase() === budget.category.toLowerCase())) return;
      persistBudgetConfigs([...budgetConfigs, { ...budget, spent: 0 }]);
    },
    [budgetConfigs, persistBudgetConfigs]
  );

  const updateBudgetLimit = useCallback(
    (category: string, limit: number) => {
      persistBudgetConfigs(budgetConfigs.map((b) => (b.category === category ? { ...b, limit } : b)));
    },
    [budgetConfigs, persistBudgetConfigs]
  );

  const deleteBudget = useCallback(
    (category: string) => {
      persistBudgetConfigs(budgetConfigs.filter((b) => b.category !== category));
    },
    [budgetConfigs, persistBudgetConfigs]
  );

  const syncSms = useCallback(
    async (range: SmsScanRange = 'all') => {
      setIsSyncing(true);
      try {
        const result = await SmsSyncWorker.sync(range);
        refresh();
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [refresh]
  );

  const clearAllData = useCallback(() => {
    AppStorage.clearAll();
    refresh();
  }, [refresh]);

  const exportBackup = useCallback(() => AppStorage.exportBackup(), []);

  const importBackup = useCallback(
    (payload: unknown) => {
      const ok = AppStorage.importBackup(payload);
      if (ok) refresh();
      return ok;
    },
    [refresh]
  );

  const value: AppDataContextValue = {
    settings,
    transactions,
    budgets,
    monthlyTransactions,
    insights,
    isSyncing,
    refresh,
    updateSettings,
    setSelectedMonth,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addBudget,
    updateBudgetLimit,
    deleteBudget,
    syncSms,
    exportBackup,
    importBackup,
    clearAllData
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return ctx;
}

export function useCurrency() {
  const { settings } = useAppData();
  const symbol = CURRENCY_SYMBOLS[settings.currency];
  const locale = CURRENCY_LOCALES[settings.currency];

  const format = useCallback((value: number, options?: Intl.NumberFormatOptions) => formatCurrency(value, settings.currency, options), [settings.currency]);

  return { symbol, locale, format };
}
