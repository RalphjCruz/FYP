## Requirement Link

- [[Hub]]
- FR-01 User Authentication
- NFR-01 Security

## Purpose (Simplified)

Check that authentication hardening enforces the protected-route invariant (`valid JWT + active user`) and preserves non-disclosure behavior for inactive accounts.

## Why This Test Exists

I added this to close security-critical decision branches introduced by `users.is_active` without broad refactoring, and to ensure inactive-account handling does not leak account-state details.

## Type

- Unit

## Scenario Type

- Branch Path
- Security
- Non-Disclosure

## Expected Behavior

- TC-B1-SEC-001: `requireAuth` returns `401` with generic token message when JWT is valid but account is inactive.
- TC-B1-SEC-002: `requireAuth` allows request when JWT is valid and account is active.
- TC-B1-SEC-003: `login` inactive-account path returns the same `401 Invalid credentials` response shape used for unknown-user path.
- TC-B1-SEC-004: `login` inactive-account path records failed attempt with user id and client IP.
- TC-B1-SEC-005: `login` inactive-account path returns `429` lock response when threshold is reached.
- TC-B1-SEC-006: unknown-user and inactive-user login failures remain payload-identical for non-disclosure.

## Actual Result

- Pass (`6/6` in targeted file run).
- Coverage checkpoint pass (`npm --prefix backend run test:coverage`), global thresholds satisfied.

## Trade-Off / Critical Thinking

- Benefit: hardens auth invariant with minimal additive changes and directly validates non-disclosure behavior.
- Limitation: this set focuses on middleware/controller logic rather than full end-to-end account lifecycle.
- Risk if skipped: inactive-account access control or auth response non-disclosure could regress silently.
- Why unit test first: fastest deterministic validation for security branch logic before adding wider integration batches.

## Evidence

- Targeted batch command:
  - `npm --prefix backend test -- --runInBand backend/tests/unit/security/authHardeningBatch1.test.ts`
- Coverage command:
  - `npm --prefix backend run test:coverage`
- Files under test:
  - `backend/src/middlewares/authMiddleware.ts`
  - `backend/src/controllers/authController.ts`
  - `backend/src/services/authAccountService.ts`
- Batch test file:
  - `backend/tests/unit/security/authHardeningBatch1.test.ts`
