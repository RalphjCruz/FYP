import {
  buildLoginRouteRateLimitKey,
  buildProtectedRouteRateLimitKey,
  consumeRateLimit,
  hashRateLimitKey,
} from '../../../src/services/requestRateLimitService.js';

describe('TC-RL-SVC-001 buildProtectedRouteRateLimitKey', () => {
  it('falls back to unknown tuple parts when normalized components are empty', () => {
    const key = buildProtectedRouteRateLimitKey({
      ipAddress: '   ',
      userId: '' as unknown as number,
      routeId: '   ',
      secret: 'secret-rl-1',
    });

    const expected = hashRateLimitKey('unknown-ip:unknown-user:unknown-route', 'secret-rl-1');
    expect(key).toBe(expected);
  });
});

describe('TC-RL-SVC-002 buildLoginRouteRateLimitKey', () => {
  it('falls back to unknown tuple parts when normalized login key components are empty', () => {
    const key = buildLoginRouteRateLimitKey({
      ipAddress: '   ',
      normalizedEmail: '   ',
      routeId: '   ',
      secret: 'secret-rl-2',
    });

    const expected = hashRateLimitKey('unknown-ip:unknown-email:unknown-route', 'secret-rl-2');
    expect(key).toBe(expected);
  });
});

describe('TC-RL-SVC-003 consumeRateLimit', () => {
  it('clamps limit/window values and returns denied result when request count exceeds safe limit', async () => {
    const now = new Date('2026-04-13T19:46:00.000Z');
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              request_count: 3,
              expires_at: '2026-04-13T19:46:01.000Z',
            },
          ],
        }),
    };

    const result = await consumeRateLimit(
      {
        keyHash: 'key-hash',
        routeKey: 'route-key',
        limit: 0,
        windowSeconds: 0,
        now,
      },
      db,
    );

    expect(result.allowed).toBe(false);
    expect(result.requestCount).toBe(3);
    expect(result.retryAfterSeconds).toBe(1);
  });
});
