import { Transaction } from '../../types';
import { RawSmsMessage, ImportProgress } from './types';
import { SmsFilterService } from './SmsFilterService';
import { SmsParserService } from './SmsParserService';
import { MerchantNormalizationService } from './MerchantNormalizationService';
import { CategoryEngine } from './CategoryEngine';
import { DuplicateDetectionService } from './DuplicateDetectionService';
import { ContactResolverService } from './ContactResolverService';
import { PartyLabelService } from './PartyLabelService';

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

export interface ImportOptions {
  /** Privacy: full SMS text is only persisted when the user has explicitly opted in. Defaults to false. */
  storeRawSmsBody?: boolean;
}

/**
 * Orchestrates the full pipeline for a batch of raw SMS: filter -> parse ->
 * normalize merchant -> resolve contact -> categorize -> de-duplicate ->
 * build Transaction. Deliberately holds no storage dependency itself beyond
 * the optional contacts lookup, so it's trivially unit-testable -- callers
 * (SmsSyncWorker) own persistence.
 */
export const TransactionImportService = {
  async importMessages(
    messages: RawSmsMessage[],
    existingTransactions: Transaction[],
    alreadyParsedIds: ReadonlySet<string>,
    onProgress?: (progress: ImportProgress) => void,
    options: ImportOptions = {}
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
            const parsed = SmsParserService.parse(msg.body, msg.address);
            if (!parsed) {
              failed++;
            } else {
              const merchant = MerchantNormalizationService.normalize(parsed.merchantRaw);
              const category = CategoryEngine.categorize(merchant, msg.body);
              const { date, time } = formatDateTime(msg.date);
              const contactName = await resolveContactName(parsed.mobileNumber, parsed.emailAddress, parsed.upiId);

              const candidate: Transaction = {
                id: `sms-parsed-${msg.id}-${msg.date}`,
                amount: parsed.amount,
                currency: parsed.currency,
                merchant,
                receiverName: parsed.receiverName,
                senderName: parsed.senderName,
                contactName,
                upiId: parsed.upiId,
                payerUpiId: parsed.payerUpiId,
                payeeUpiId: parsed.payeeUpiId,
                mobileNumber: parsed.mobileNumber,
                emailAddress: parsed.emailAddress,
                bank: parsed.bank,
                accountLast4: parsed.accountLast4,
                cardLast4: parsed.cardLast4,
                utrNumber: parsed.utrNumber,
                date,
                time,
                type: parsed.type,
                status: parsed.status,
                paymentMethod: parsed.paymentMethod,
                category,
                balanceAfter: parsed.balanceAfter,
                referenceNumber: parsed.referenceNumber,
                confidenceScore: parsed.confidenceScore,
                sourceSMSId: msg.id,
                sourceText: options.storeRawSmsBody ? msg.body : undefined
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

/**
 * A user's own rename (PartyLabelService) always wins over an auto-resolved
 * device-contact name -- same "explicit correction beats inference" pattern
 * as CategoryEngine/LearningService. Falls back to undefined (raw UPI
 * ID/number shown in the UI) when neither is available.
 */
async function resolveContactName(mobileNumber?: string, emailAddress?: string, upiId?: string): Promise<string | undefined> {
  const partyId = mobileNumber || emailAddress || upiId;
  if (!partyId) return undefined;

  const manualLabel = PartyLabelService.getLabel(partyId);
  if (manualLabel) return manualLabel;

  return ContactResolverService.resolve({ mobileNumber, emailAddress });
}
