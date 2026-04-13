## Requirement Link

- [[Hub]]
- FR-10 Account Data Export (Privacy)
- NFR-01 Security

## Purpose (Simplified)

Check that account export returns only authenticated user data in structured JSON format, and that export cooldown/rate-limit protection is enforced with `429` + `Retry-After`.

## Why This Test Exists

I added this to validate the first privacy endpoint slice (`GET /api/account/export`) with strict scope guarantees and abuse protection before moving to deletion workflows.

## Type

- Unit

## Scenario Type

- Branch Path
- Security
- Data Scope
- Rate Limiting

## Expected Behavior

- TC-B2-EXP-001: `buildAccountDataExport` should scope data reads to `userId`-filtered queries.
- TC-B2-EXP-002: export payload should be structured JSON grouped by domain entity.
- TC-B2-EXP-003: optional/missing tables should produce safe null/empty domain payloads.
- TC-B2-EXP-004: `exportAccountDataController` should return `401` when auth user is missing.
- TC-B2-EXP-005: cooldown breach should return `429` and set `Retry-After`.
- TC-B2-EXP-006: under limit, controller should return `success: true` with export payload.

## Actual Result

- Pass (`6/6` in targeted file run).
- Coverage checkpoint pass (`npm --prefix backend run test:coverage`), global thresholds satisfied.

## Trade-Off / Critical Thinking

- Benefit: introduces privacy export capability with explicit scope controls and immediate anti-abuse guard.
- Limitation: this batch does not yet include deletion request/cancel lifecycle APIs (planned next batch).
- Risk if skipped: data scope bugs or export endpoint abuse could reach production unnoticed.
- Why unit test first: fastest deterministic way to lock scope, shape, and cooldown contracts before broader integration rollout.

## Evidence

- Targeted batch command:
  - `npm --prefix backend test -- --runInBand backend/tests/unit/security/accountExportBatch2.test.ts`
- Coverage command:
  - `npm --prefix backend run test:coverage`
- Files under test:
  - `backend/src/services/accountService.ts`
  - `backend/src/services/requestRateLimitService.ts`
  - `backend/src/controllers/accountController.ts`
- Batch test file:
  - `backend/tests/unit/security/accountExportBatch2.test.ts`
