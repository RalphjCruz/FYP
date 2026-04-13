## Requirement Link

- [[Hub]]
- FR-11 Account Deletion Lifecycle (Privacy)
- NFR-01 Security
- NFR-02 Reliability

## Purpose (Simplified)

Check that account deletion request/cancel/status flows are idempotent and that deletion request/cancel actions emit operational audit events.

## Why This Test Exists

I added this to lock the deletion lifecycle behavior before purge-job automation, so duplicate requests and cancellation edge cases do not produce inconsistent state.

## Type

- Unit

## Scenario Type

- Branch Path
- Idempotency
- State Transition
- Security
- Audit Logging

## Expected Behavior

- TC-B3-DEL-001: `requestAccountDeletion` should create a new `pending` deletion request when none exists.
- TC-B3-DEL-002: `requestAccountDeletion` should return idempotent `pending` response when request already exists.
- TC-B3-DEL-003: `cancelAccountDeletion` should return idempotent `none` response when no request exists.
- TC-B3-DEL-004: `cancelAccountDeletion` should transition a `pending` request to `cancelled`.
- TC-B3-DEL-005: `getAccountDeletionStatusController` should return authenticated user deletion status payload.
- TC-B3-DEL-006: request/cancel deletion controller flows should write operational audit events.

## Actual Result

- Pass (`6/6` in targeted file run).
- Coverage checkpoint pass (`npm --prefix backend run test:coverage`), global thresholds satisfied.

## Trade-Off / Critical Thinking

- Benefit: deletion lifecycle is now explicit, idempotent, and traceable with audit events.
- Limitation: this batch does not execute due purges yet; purge orchestration is in the next batch.
- Risk if skipped: duplicate deletion/cancel actions could drift state and weaken privacy workflows.
- Why unit test first: quickest deterministic way to validate branching/idempotency contracts before adding purge job complexity.

## Evidence

- Targeted batch command:
  - `npm --prefix backend test -- --runInBand backend/tests/unit/security/accountDeletionBatch3.test.ts`
- Coverage command:
  - `npm --prefix backend run test:coverage`
- Files under test:
  - `backend/src/services/accountDeletionService.ts`
  - `backend/src/controllers/accountController.ts`
  - `backend/src/services/operationalAuditLogService.ts`
- Batch test file:
  - `backend/tests/unit/security/accountDeletionBatch3.test.ts`
