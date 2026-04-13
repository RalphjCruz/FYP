## Requirement Link

- [[Hub]]
- FR-13 Rate-Limit Key Normalization & Response Contract
- NFR-01 Security
- NFR-03 Performance

## Purpose (Simplified)

Check that rate-limit keys are generated with stable normalization rules and that `429` responses consistently include `Retry-After`.

## Why This Test Exists

I added this to harden rate-limit consistency and stop bypasses caused by key-variation drift (email case/whitespace, route tuple inconsistency), while enforcing a predictable retry contract.

## Type

- Unit

## Scenario Type

- Data Normalization
- Consistency
- Security
- Rate Limiting

## Expected Behavior

- TC-B5-RL-001: email normalization should trim and lowercase before key generation.
- TC-B5-RL-002: login rate-limit key should remain stable for equivalent normalized email values.
- TC-B5-RL-003: protected-route key should be stable for normalized tuple and change when tuple components change.
- TC-B5-RL-004: lock-status login branch should return `429` and set `Retry-After`.
- TC-B5-RL-005: lock-threshold login branch should return `429` and set `Retry-After`.
- TC-B5-RL-006: login request-rate-limit branch should return `429` and set `Retry-After`.

## Actual Result

- Pass (`6/6` in targeted file run).
- Coverage checkpoint pass (`npm --prefix backend run test:coverage`), global thresholds satisfied.

## Trade-Off / Critical Thinking

- Benefit: key generation is explicit and deterministic, reducing bypass risk from normalization inconsistencies.
- Limitation: request-rate-limit branch is skipped in test nodeEnv by default and validated via targeted override in batch test.
- Risk if skipped: subtle key drift could weaken rate limiting and produce inconsistent client retry behavior.
- Why unit test first: quickest deterministic way to validate key math and response contract branches.

## Evidence

- Targeted batch command:
  - `npm --prefix backend test -- --runInBand backend/tests/unit/security/rateLimitBatch5.test.ts`
- Coverage command:
  - `npm --prefix backend run test:coverage`
- Files under test:
  - `backend/src/services/requestRateLimitService.ts`
  - `backend/src/controllers/authController.ts`
  - `backend/src/controllers/accountController.ts`
- Batch test file:
  - `backend/tests/unit/security/rateLimitBatch5.test.ts`
