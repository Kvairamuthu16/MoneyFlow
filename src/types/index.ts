export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 
  | 'UPI' 
  | 'ATM' 
  | 'Cash Withdrawal' 
  | 'Bank Transfer' 
  | 'Credit Card' 
  | 'Debit Card' 
  | 'Wallet' 
  | 'Cash'
  | 'Other';

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  bank: string;
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
}
