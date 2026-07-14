import { normalizeMerchant } from '../../src/services/sms/MerchantNormalizationService';

describe('MerchantNormalizationService', () => {
  it('normalizes every common spelling of Amazon to a single canonical name', () => {
    expect(normalizeMerchant('AMZN')).toBe('Amazon');
    expect(normalizeMerchant('AMAZON PAY')).toBe('Amazon');
    expect(normalizeMerchant('amazon seller')).toBe('Amazon');
    expect(normalizeMerchant('Amazon.in')).toBe('Amazon');
  });

  it('normalizes other common merchants', () => {
    expect(normalizeMerchant('FLIPKART INTERNET PVT LTD')).toBe('Flipkart');
    expect(normalizeMerchant('SWIGGY*ORDER1234')).toBe('Swiggy');
    expect(normalizeMerchant('UBER TRIP')).toBe('Uber');
    expect(normalizeMerchant('ZOMATO ONLINE')).toBe('Zomato');
    expect(normalizeMerchant('D-MART RETAIL')).toBe('DMart');
    expect(normalizeMerchant('STARBUCKS COFFEE')).toBe('Starbucks');
  });

  it('leaves unrecognized merchants untouched', () => {
    expect(normalizeMerchant('BISMI STORES')).toBe('BISMI STORES');
  });
});
