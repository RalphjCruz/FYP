import {
  parseSimulatedDayOffset,
  parseUserId,
  resolveSimulatedNowUtc,
} from '../../../../src/controllers/validators/slimeRequestValidators.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TC-SRV-001 parseUserId', () => {
  it('returns null when user id input is missing', () => {
    expect(parseUserId(undefined)).toBeNull();
  });
});

describe('TC-SRV-002 parseUserId', () => {
  it('uses the first route value when user id is provided as an array', () => {
    expect(parseUserId(['12', '99'])).toBe(12);
  });
});

describe('TC-SRV-003 parseUserId', () => {
  it('returns null for non-positive or malformed user id values', () => {
    expect(parseUserId('0')).toBeNull();
    expect(parseUserId('-5')).toBeNull();
    expect(parseUserId('abc')).toBeNull();
  });
});

describe('TC-SRV-004 parseSimulatedDayOffset', () => {
  it('parses integer offsets and clamps values to the [-365, 365] range', () => {
    expect(parseSimulatedDayOffset('30')).toBe(30);
    expect(parseSimulatedDayOffset('999')).toBe(365);
    expect(parseSimulatedDayOffset('-999')).toBe(-365);
  });
});

describe('TC-SRV-005 parseSimulatedDayOffset', () => {
  it('returns 0 for malformed simulated day offset input', () => {
    expect(parseSimulatedDayOffset('bad-input')).toBe(0);
  });
});

describe('TC-SRV-006 resolveSimulatedNowUtc', () => {
  it('returns undefined in production/zero-offset and returns shifted Date in non-production', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    expect(resolveSimulatedNowUtc(3, 'production')).toBeUndefined();
    expect(resolveSimulatedNowUtc(0, 'development')).toBeUndefined();

    const shifted = resolveSimulatedNowUtc(2, 'development');
    expect(shifted).toBeInstanceOf(Date);
    expect(shifted?.getTime()).toBe(1_700_000_000_000 + 2 * 24 * 60 * 60 * 1000);

    nowSpy.mockRestore();
  });
});
