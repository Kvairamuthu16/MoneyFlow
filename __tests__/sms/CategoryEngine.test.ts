import { initializeStorage, AppStorage } from '../../src/storage/mmkv';
import { categorize, ALL_CATEGORIES } from '../../src/services/sms/CategoryEngine';
import { LearningService } from '../../src/services/sms/LearningService';

describe('CategoryEngine', () => {
  beforeEach(async () => {
    await initializeStorage();
    AppStorage.clearAll();
  });

  it('categorizes well-known merchants correctly', () => {
    expect(categorize('Swiggy', 'Rs.350 spent at Swiggy')).toBe('Food');
    expect(categorize('Amazon', 'Rs.1250 debited towards Amazon')).toBe('Shopping');
    expect(categorize('Uber', 'Rs.220 paid to Uber')).toBe('Transport');
    expect(categorize('IRCTC', 'Rs.1500 paid to IRCTC for train ticket')).toBe('Travel');
    expect(categorize('Indian Oil', 'Rs.2000 spent at Indian Oil fuel station')).toBe('Fuel');
    expect(categorize('Netflix', 'Rs.649 subscription debited to Netflix')).toBe('Entertainment');
    expect(categorize('BESCOM', 'Rs.1800 paid towards BESCOM electricity bill')).toBe('Utilities');
    expect(categorize('Jio', 'Rs.299 mobile recharge for Jio')).toBe('Recharge');
    expect(categorize('Apollo Hospital', 'Rs.900 paid at Apollo Hospital pharmacy')).toBe('Medical');
    expect(categorize('ATM Withdrawal', 'Rs.2000 cash withdrawal at ATM')).toBe('Cash');
    expect(categorize('ACME CORP', 'Salary credited from ACME CORP')).toBe('Salary');
    expect(categorize('HDFC Life', 'Refund of Rs.500 reversed to your account')).toBe('Refund');
  });

  it('categorizes the newly added transaction types', () => {
    expect(categorize('Personal Loan', 'Rs.50000 loan disbursed to your account')).toBe('Loan');
    expect(categorize('EMI', 'Rs.4500 EMI auto debited for your loan')).toBe('EMI');
    expect(categorize('Gaana', 'Rs.99 debited towards your subscription renewal')).toBe('Subscription');
    expect(categorize('Gift Card Purchase', 'Rs.500 spent on a gift card for a friend')).toBe('Gifts');
    expect(categorize('Income Tax', 'Rs.15000 paid towards advance tax')).toBe('Taxes');
    expect(categorize('Cashback', 'Rs.20 cashback credited to your account')).toBe('Cashback');
    expect(categorize('Interest', 'Rs.150 interest credited to your savings account')).toBe('Income');
  });

  it('falls back to Other for unrecognized merchants', () => {
    expect(categorize('BISMI STORES', 'Rs.80 sent to BISMI STORES')).toBe('Other');
  });

  it('every category the engine can produce is present in ALL_CATEGORIES', () => {
    expect(ALL_CATEGORIES).toContain('Medical');
    expect(ALL_CATEGORIES).toContain('Transport');
    expect(ALL_CATEGORIES).toContain('Recharge');
    expect(ALL_CATEGORIES).toContain('Income');
    expect(ALL_CATEGORIES).toContain('Salary');
    expect(ALL_CATEGORIES).toContain('Loan');
    expect(ALL_CATEGORIES).toContain('Subscription');
    expect(ALL_CATEGORIES).toContain('Gifts');
    expect(ALL_CATEGORIES).toContain('Taxes');
    expect(ALL_CATEGORIES).toContain('Cashback');
    expect(ALL_CATEGORIES).toContain('Refund');
  });

  it('applies a user-taught correction over the default keyword rules', () => {
    expect(categorize('Amazon', 'Rs.500 debited towards Amazon')).toBe('Shopping');

    LearningService.recordCorrection('Amazon', 'Office Expense');

    expect(categorize('Amazon', 'Rs.750 debited towards Amazon')).toBe('Office Expense');
  });

  it('learned corrections are keyed per-merchant, case-insensitively', () => {
    LearningService.recordCorrection('Starbucks', 'Personal Care');
    expect(categorize('starbucks', 'Rs.300 spent at starbucks')).toBe('Personal Care');
    expect(categorize('Swiggy', 'Rs.300 spent at Swiggy')).toBe('Food');
  });
});
