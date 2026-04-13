## Requirement Link

- [[Hub]]
- FR-12 Account Purge & Retention Jobs (Privacy)
- NFR-01 Security
- NFR-02 Reliability

## Purpose (Simplified)

Check that due account purge jobs cleanup non-cascade artifacts, write operational logs outside user-owned data, and stay retry-safe under partial failure.

## Why This Test Exists

I added this to lock retention/purge behavior before moving to rate-limit and focus anti-cheat hardening, so purge failures can be retried safely without corrupting account-deletion state.

## Type

- Unit

## Scenario Type

- Branch Path
- Reliability
- Failure Handling
- Idempotency
- Audit Logging

## Expected Behavior

- TC-B4-PRG-001: purge job should return no-op summary when no due deletion requests exist.
- TC-B4-PRG-002: purge single-request flow should cleanup non-cascade artifacts and delete user when due.
- TC-B4-PRG-003: purge execution should write operational/system `account_purge_executed` log.
- TC-B4-PRG-004: purge job should continue after one failure, record retry metadata, and purge remaining due requests.
- TC-B4-PRG-005: purge single-request flow should remain idempotent for missing rerun and zero-row delete scenarios.
- TC-B4-PRG-006: purge single-request flow should return false for non-pending and not-yet-due requests.

## Actual Result

- Pass (`6/6` in targeted file run).
- Coverage checkpoint pass (`npm --prefix backend run test:coverage`), global thresholds satisfied.

## Trade-Off / Critical Thinking

- Benefit: purge behavior is now explicit, transactional, and safe to rerun daily.
- Limitation: this batch introduces service-level purge orchestration only; scheduler wiring is still external/manual.
- Risk if skipped: partial purge failures could leave inconsistent state or silently miss retries.
- Why unit test first: fastest deterministic way to validate retry/idempotency branches and transactional outcomes.

## Evidence

- Targeted batch command:
  - `npm --prefix backend test -- --runInBand backend/tests/unit/security/accountPurgeBatch4.test.ts`
- Coverage command:
  - `npm --prefix backend run test:coverage`
- Files under test:
  - `backend/src/services/accountRetentionService.ts`
  - `backend/src/services/accountDeletionService.ts`
  - `backend/src/services/operationalAuditLogService.ts`
- Batch test file:
  - `backend/tests/unit/security/accountPurgeBatch4.test.ts`
