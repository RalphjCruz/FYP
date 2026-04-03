import { clampNumber, parseInteger, parsePositiveInteger, sanitizeEmail, sanitizeSlug, sanitizeText } from '../../../src/utils/inputSanitizer.js';

describe('TC-UTIL-001 sanitizeText', () => {
  it('removes control characters and trims text by default', () => {
    const input = '  hello\u0001world  ';

    const result = sanitizeText(input);

    expect(result).toBe('helloworld');
  });
});

describe('TC-UTIL-002 sanitizeText', () => {
  it('collapses internal whitespace when collapseWhitespace is enabled', () => {
    const input = '  one    two   three  ';

    const result = sanitizeText(input, { collapseWhitespace: true });

    expect(result).toBe('one two three');
  });
});

describe('TC-UTIL-003 sanitizeText', () => {
  it('respects trim=false and keeps outer whitespace after collapsing', () => {
    const input = '  one   two  ';

    const result = sanitizeText(input, { trim: false, collapseWhitespace: true });

    expect(result).toBe(' one two ');
  });
});

describe('TC-UTIL-004 sanitizeText', () => {
  it('applies maxLength only when value is a positive integer', () => {
    expect(sanitizeText('abcdef', { maxLength: 3 })).toBe('abc');
    expect(sanitizeText('abcdef', { maxLength: 0 })).toBe('abcdef');
    expect(sanitizeText('abcdef', { maxLength: 2.5 })).toBe('abcdef');
  });
});

describe('TC-UTIL-005 sanitizeText', () => {
  it('returns empty string when input is not a string', () => {
    expect(sanitizeText(1234)).toBe('');
    expect(sanitizeText(null)).toBe('');
  });
});

describe('TC-UTIL-006 sanitizeEmail', () => {
  it('normalizes email by trimming, collapsing whitespace, and lowercasing', () => {
    const result = sanitizeEmail('  Student@Example.COM  ');

    expect(result).toBe('student@example.com');
  });
});

describe('TC-UTIL-007 sanitizeSlug', () => {
  it('accepts valid slug format and rejects invalid characters', () => {
    expect(sanitizeSlug('My-Slug-123')).toBe('my-slug-123');
    expect(sanitizeSlug('bad slug!')).toBe('');
  });
});

describe('TC-UTIL-008 parseInteger', () => {
  it('returns parsed integer for valid input and fallback for malformed input', () => {
    expect(parseInteger('42', 0)).toBe(42);
    expect(parseInteger('not-a-number', 9)).toBe(9);
  });
});

describe('TC-UTIL-009 parsePositiveInteger', () => {
  it('returns only positive integers and rejects zero/negative/invalid inputs', () => {
    expect(parsePositiveInteger('12')).toBe(12);
    expect(parsePositiveInteger('0')).toBeNull();
    expect(parsePositiveInteger('-5')).toBeNull();
    expect(parsePositiveInteger(undefined)).toBeNull();
  });
});

describe('TC-UTIL-010 clampNumber', () => {
  it('clamps value within min and max bounds', () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-1, 0, 10)).toBe(0);
    expect(clampNumber(12, 0, 10)).toBe(10);
  });
});

