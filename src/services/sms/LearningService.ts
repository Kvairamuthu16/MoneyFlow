import { AppStorage } from '../../storage/mmkv';

/**
 * Remembers merchant -> category corrections the user makes by hand (e.g.
 * re-tagging "Amazon" from Shopping to Office Expense) so CategoryEngine can
 * auto-apply the same category the next time that merchant shows up.
 */
function key(merchant: string): string {
  return merchant.trim().toLowerCase();
}

export const LearningService = {
  recordCorrection(merchant: string, category: string): void {
    if (!merchant.trim()) return;
    const overrides = AppStorage.getMerchantOverrides();
    overrides[key(merchant)] = category;
    AppStorage.saveMerchantOverrides(overrides);
  },

  getOverride(merchant: string): string | undefined {
    return AppStorage.getMerchantOverrides()[key(merchant)];
  },

  clearOverride(merchant: string): void {
    const overrides = AppStorage.getMerchantOverrides();
    delete overrides[key(merchant)];
    AppStorage.saveMerchantOverrides(overrides);
  }
};
