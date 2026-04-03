import { getClientIp } from '../../../src/services/authSecurityService.js';

describe('TC-ASEC-001 getClientIp', () => {
  it('returns the first forwarded IP when x-forwarded-for string has multiple values', () => {
    const result = getClientIp('10.0.0.5', '203.0.113.42, 198.51.100.11');

    expect(result).toBe('203.0.113.42');
  });
});
