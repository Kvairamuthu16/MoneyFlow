import { Transaction } from '../../types';
import { RawSmsMessage, ImportProgress } from './types';
import { SmsFilterService } from './SmsFilterService';
import { SmsParserService } from './SmsParserService';
import { MerchantNormalizationService } from './MerchantNormalizationService';
import { CategoryEngine } from './CategoryEngine';
import { DuplicateDetectionService } from './DuplicateDetectionService';

const BATCH_SIZE = 25;

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function formatDateTime(timestamp: number): { date: string; time: string } {
  const dateObj = new Date(timestamp);
  return {
    date: dateObj.toISOString().split('T')[0],
    time: dateObj.toTimeString().split(' ')[0].substring(0, 5)
  };
}

export interface ImportOutcome {
  newTransactions: Transaction[];
  newlyParsedIds: string[];
  skippedDuplicates: number;
  skippedFiltered: number;
  failed: number;
}

/**
 * Orchestrates the full pipeline for a batch of raw SMS: filter -> parse ->
 * normalize merchant -> categorize -> de-duplicate -> build Transaction.
 * Deliberately holds no storage or native-module dependency itself, so it's
 * trivially unit-testable -- callers (SmsSyncWorker) own persistence.
 */
export const TransactionImportService = {
  async importMessages(
    messages: RawSmsMessage[],
    existingTransactions: Transaction[],
    alreadyParsedIds: ReadonlySet<string>,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportOutcome> {
    const newTransactions: Transaction[] = [];
    const newlyParsedIds: string[] = [];
    let skippedDuplicates = 0;
    let skippedFiltered = 0;
    let failed = 0;

    const dedupPool = [...existingTransactions];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (!alreadyParsedIds.has(msg.id)) {
        try {
          const decision = SmsFilterService.evaluate(msg.address, msg.body);
          if (!decision.shouldProcess) {
            skippedFiltered++;
          } else {
            const parsed = SmsParserService.parse(msg.body);
            if (!parsed) {
              failed++;
            } else {
              const merchant = MerchantNormalizationService.normalize(parsed.merchantRaw);
              const category = CategoryEngine.categorize(merchant, msg.body);
              const { date, time } = formatDateTime(msg.date);

              const candidate: Transaction = {
                id: `sms-parsed-${msg.id}-${msg.date}`,
                amount: parsed.amount,
                currency: parsed.currency,
                merchant,
                receiverName: parsed.receiverName,
                senderName: parsed.senderName,
                upiId: parsed.upiId,
                bank: parsed.bank,
                accountLast4: parsed.accountLast4,
                date,
                time,
                type: parsed.type,
                paymentMethod: parsed.paymentMethod,
                category,
                balanceAfter: parsed.balanceAfter,
                referenceNumber: parsed.referenceNumber,
                confidenceScore: parsed.confidenceScore,
                sourceSMSId: msg.id,
                sourceText: msg.body
              };

              if (DuplicateDetectionService.isDuplicate(candidate, dedupPool)) {
                skippedDuplicates++;
              } else {
                newTransactions.push(candidate);
                dedupPool.push(candidate);
              }
            }
          }
        } catch (error) {
          // A single malformed SMS must never abort the whole import batch.
          failed++;
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[TransactionImportService] failed to parse SMS', msg.id, error);
          }
        }
        newlyParsedIds.push(msg.id);
      }

      if ((i + 1) % BATCH_SIZE === 0) {
        onProgress?.({ processed: i + 1, total: messages.length });
        await yieldToUI();
      }
    }

    onProgress?.({ processed: messages.length, total: messages.length });

    return { newTransactions, newlyParsedIds, skippedDuplicates, skippedFiltered, failed };
  }
};
