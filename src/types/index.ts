export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'success' | 'failed' | 'reversed' | 'pending';

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
  contactName?: string; // resolved device-contact name (or a user-set custom label) for the counterparty -- shown instead of a raw UPI ID/phone number when available
  upiId?: string; // VPA this SMS was addressed to/from, e.g. "merchant@okhdfcbank"
  payerUpiId?: string; // VPA that paid, for income/credit transactions
  payeeUpiId?: string; // VPA that was paid, for expense/debit transactions
  mobileNumber?: string; // counterparty's phone number, when the UPI ID or SMS text exposes one (feeds contact resolution)
  emailAddress?: string;
  bank: string;
  accountLast4?: string; // last 3-4 digits of the account the SMS referenced, for multi-account households
  cardLast4?: string; // last digits of a card, kept distinct from the bank account digits
  utrNumber?: string; // NEFT/RTGS/IMPS UTR, distinct from a generic UPI/txn reference number
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: TransactionType;
  status: TransactionStatus;
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
  contactsPermissionGranted: boolean;
  realtimeSmsDetectionEnabled: boolean; // RECEIVE_SMS granted -- native listener (see android/.../SmsReceiver.kt) is active
  storeRawSmsBody: boolean; // privacy: off by default -- sourceText is only persisted when the user opts in
  notificationsEnabled: boolean; // budget-threshold, salary-credited, and bill-due-soon local notifications
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  transactions: Transaction[];
  budgets: Budget[];
}
