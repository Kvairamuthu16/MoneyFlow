import { AppStorage } from '../../storage/mmkv';

/**
 * User-chosen display labels for a transaction counterparty (a phone number
 * or UPI ID), independent of both device contacts and any resolved contact
 * name. Lets someone rename "9876543210@ybl" to "Landlord" without writing
 * anything back to their actual address book.
 */
function key(partyId: string): string {
  return partyId.trim().toLowerCase();
}

export const PartyLabelService = {
  setLabel(partyId: string, label: string): void {
    if (!partyId.trim()) return;
    const overrides = AppStorage.getPartyLabelOverrides();
    overrides[key(partyId)] = label;
    AppStorage.savePartyLabelOverrides(overrides);
  },

  getLabel(partyId: string): string | undefined {
    return AppStorage.getPartyLabelOverrides()[key(partyId)];
  },

  clearLabel(partyId: string): void {
    const overrides = AppStorage.getPartyLabelOverrides();
    delete overrides[key(partyId)];
    AppStorage.savePartyLabelOverrides(overrides);
  }
};
