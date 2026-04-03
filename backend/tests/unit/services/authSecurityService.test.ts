import { getClientIp } from '../../../src/services/authSecurityService.js';

describe('TC-ASEC-001 getClientIp', () => {
  it('returns the first forwarded IP when x-forwarded-for string has multiple values', () => {
    const result = getClientIp('10.0.0.5', '203.0.113.42, 198.51.100.11');

    expect(result).toBe('203.0.113.42');
  });
});

describe('TC-ASEC-002 getClientIp', () => {
  it('returns the first IP when x-forwarded-for is provided as an array', () => {
    const result = getClientIp('10.0.0.5', ['198.51.100.8', '198.51.100.9']);

    expect(result).toBe('198.51.100.8');
  });
});

describe('TC-ASEC-003 getClientIp', () => {
  it('falls back to request IP when forwarded header is missing', () => {
    const result = getClientIp('10.0.0.5', undefined);

    expect(result).toBe('10.0.0.5');
  });
});

describe('TC-ASEC-004 getClientIp', () => {
  it('returns unknown when neither forwarded header nor request IP is available', () => {
    const result = getClientIp(undefined, undefined);

    expect(result).toBe('unknown');
  });
});
