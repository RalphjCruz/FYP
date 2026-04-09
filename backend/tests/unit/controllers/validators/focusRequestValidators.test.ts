import {
  parseOptionalDistractionLevel,
  parseOptionalStudyStyle,
  parseOptionalTimezone,
  parseOptionalUtcDate,
} from '../../../../src/controllers/validators/focusRequestValidators.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-FRV-001 parseOptionalUtcDate', () => {
  it('returns null for non-string input', () => {
    expect(parseOptionalUtcDate(undefined)).toBeNull();
    expect(parseOptionalUtcDate(123)).toBeNull();
    expect(parseOptionalUtcDate({})).toBeNull();
  });
});

describe('TC-FRV-002 parseOptionalUtcDate', () => {
  it('returns null for blank or invalid date strings', () => {
    expect(parseOptionalUtcDate('   ')).toBeNull();
    expect(parseOptionalUtcDate('not-a-date')).toBeNull();
  });
});

describe('TC-FRV-003 parseOptionalUtcDate', () => {
  it('returns Date instance for valid ISO date strings', () => {
    const parsed = parseOptionalUtcDate(' 2026-04-08T11:30:00.000Z ');
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toBe('2026-04-08T11:30:00.000Z');
  });
});

describe('TC-FRV-004 parseOptionalTimezone', () => {
  it('returns sanitized timezone string or undefined when empty', () => {
    expect(parseOptionalTimezone('  Europe/Dublin  ')).toBe('Europe/Dublin');
    expect(parseOptionalTimezone('   ')).toBeUndefined();
    expect(parseOptionalTimezone(undefined)).toBeUndefined();
  });
});

describe('TC-FRV-005 parseOptionalStudyStyle', () => {
  it('accepts only allowed study styles and rejects invalid values', () => {
    expect(parseOptionalStudyStyle('deep_focus')).toBe('deep_focus');
    expect(parseOptionalStudyStyle('balanced')).toBe('balanced');
    expect(parseOptionalStudyStyle('sprint')).toBe('sprint');
    expect(parseOptionalStudyStyle(' random ')).toBeUndefined();
    expect(parseOptionalStudyStyle('   ')).toBeUndefined();
  });
});

describe('TC-FRV-006 parseOptionalDistractionLevel', () => {
  it('accepts only allowed distraction levels and rejects invalid values', () => {
    expect(parseOptionalDistractionLevel('low')).toBe('low');
    expect(parseOptionalDistractionLevel('medium')).toBe('medium');
    expect(parseOptionalDistractionLevel('high')).toBe('high');
    expect(parseOptionalDistractionLevel('none')).toBeUndefined();
    expect(parseOptionalDistractionLevel('   ')).toBeUndefined();
  });
});
