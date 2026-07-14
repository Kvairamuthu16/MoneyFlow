export type TransactionType = 'income' | 'expense';

export type PaymentMethod =
  | 'UPI'
  | 'ATM'
  | 'Cash Withdrawal'
  | 'Cash Deposit'
  | 'Bank Transfer'
  | 'NEFT'
  | 'RTGS'
  | 'IMPS'
  | 'Credit Card'
  | 'Debit Card'
  | 'Tap & Pay'
  | 'Wallet'
  | 'Cash'
  | 'Standing Instruction'
  | 'Auto Debit'
  | 'Cheque'
  | 'FASTag'
  | 'Other';

export interface Transaction {
  id: string;
  amount: number;
  currency: string; // ISO-ish code or symbol as seen in the SMS, e.g. "INR", "USD"
  merchant: string;
  receiverName?: string; // who the money went to, when distinct from the parsed merchant string
  senderName?: string; // who the money came from, for credit/income messages
  upiId?: string; // VPA, e.g. "merchant@okhdfcbank"
  bank: string;
  accountLast4?: string; // last 3-4 digits of the account/card the SMS referenced, for multi-account households
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: TransactionType;
  paymentMethod: PaymentMethod;
  category: string;
  balanceAfter?: number;
  referenceNumber?: string;
  confidenceScore: number; // 0.0 - 1.0
  sourceSMSId?: string;
  sourceText?: string;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
}

export interface SMSMessage {
  id: string;
  address: string; // Sender number/handle e.g. "AD-HDFCBK"
  body: string;
  timestamp: number;
}

export interface SmartInsight {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  timestamp: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  smsPermissionGranted: boolean;
  selectedMonth: string; // YYYY-MM (e.g. "2026-07")
  biometricLockEnabled: boolean;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  transactions: Transaction[];
  budgets: Budget[];
}
