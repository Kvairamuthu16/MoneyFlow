import { initializeStorage, AppStorage } from '../../src/storage/mmkv';
import { PartyLabelService } from '../../src/services/sms/PartyLabelService';

describe('PartyLabelService', () => {
  beforeEach(async () => {
    await initializeStorage();
    AppStorage.clearAll();
  });

  it('persists and retrieves a custom label for a party', () => {
    PartyLabelService.setLabel('9876543210@ybl', 'Landlord');
    expect(PartyLabelService.getLabel('9876543210@ybl')).toBe('Landlord');
  });

  it('is case-insensitive on the party identifier', () => {
    PartyLabelService.setLabel('Ramesh@OkAxis', 'Roommate');
    expect(PartyLabelService.getLabel('ramesh@okaxis')).toBe('Roommate');
  });

  it('returns undefined for a party with no label set', () => {
    expect(PartyLabelService.getLabel('unknown@upi')).toBeUndefined();
  });

  it('clears a label', () => {
    PartyLabelService.setLabel('9876543210@ybl', 'Landlord');
    PartyLabelService.clearLabel('9876543210@ybl');
    expect(PartyLabelService.getLabel('9876543210@ybl')).toBeUndefined();
  });
});
