import {
  parseCustomizationDevCoinAmount,
  parseCustomizationItemId,
} from '../../../../src/controllers/validators/customizationRequestValidators.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-CRV-001 parseCustomizationDevCoinAmount', () => {
  it('parses integer string coin amount correctly', () => {
    expect(parseCustomizationDevCoinAmount('250')).toBe(250);
  });
});

describe('TC-CRV-002 parseCustomizationDevCoinAmount', () => {
  it('returns fallback zero for malformed coin amount input', () => {
    expect(parseCustomizationDevCoinAmount('coins')).toBe(0);
    expect(parseCustomizationDevCoinAmount(undefined)).toBe(0);
  });
});

describe('TC-CRV-003 parseCustomizationDevCoinAmount', () => {
  it('follows parseInt behavior for decimal-like and prefixed values', () => {
    expect(parseCustomizationDevCoinAmount('12.9')).toBe(12);
    expect(parseCustomizationDevCoinAmount('0010')).toBe(10);
  });
});

describe('TC-CRV-004 parseCustomizationItemId', () => {
  it('returns sanitized slug for valid customization item id', () => {
    expect(parseCustomizationItemId('  neon-hat-01  ')).toBe('neon-hat-01');
  });
});

describe('TC-CRV-005 parseCustomizationItemId', () => {
  it('returns null when customization item id is invalid slug content', () => {
    expect(parseCustomizationItemId('Neon Hat!')).toBeNull();
    expect(parseCustomizationItemId('')).toBeNull();
  });
});

describe('TC-CRV-006 parseCustomizationItemId', () => {
  it('enforces slug max length and lowercasing through sanitizer', () => {
    const overLength = 'SUPER-LONG-SLUG-ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890-TAIL';
    const parsed = parseCustomizationItemId(overLength);
    expect(parsed).toBe('super-long-slug-abcdefghijklmnopqrstuvwxyz-1234567890-tail'.slice(0, 64));
    expect(parsed?.length).toBeLessThanOrEqual(64);
  });
});
