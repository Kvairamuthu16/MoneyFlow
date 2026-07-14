export interface RawSmsMessage {
  id: string;
  address: string;
  body: string;
  date: number; // epoch ms
}

export type SmsScanRange = 'day' | 'week' | 'month' | 'all';

export interface ImportProgress {
  processed: number;
  total: number;
}

export interface ImportResult {
  added: number;
  skippedDuplicates: number;
  skippedFiltered: number;
  failed: number;
  total: number;
  scanned: number;
}
