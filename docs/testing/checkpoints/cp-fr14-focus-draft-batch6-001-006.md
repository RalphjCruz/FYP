## Requirement Link

- [[Hub]]
- FR-14 Focus Draft Lifecycle & Anti-Cheat
- NFR-01 Security
- NFR-02 Reliability

## Purpose (Simplified)

Check that focus draft start/complete flow enforces one-active-draft lifecycle, server-authoritative duration validation, and replay rejection.

## Why This Test Exists

I added this to close the focus anti-cheat gaps with minimal-change additions: explicit draft lifecycle states, minimum-duration enforcement, and completion replay blocking.

## Type

- Unit

## Scenario Type

- Branch Path
- Security
- Anti-Cheat
- State Transition
- Replay Protection

## Expected Behavior

- TC-B6-FDR-001: `startFocusSessionDraft` should mark prior active draft as `invalidated` before inserting new active draft.
- TC-B6-FDR-002: repeated start should preserve one-active-draft lifecycle by ordering invalidation before insertion.
- TC-B6-FDR-003: completion should fail when referenced draft does not exist for authenticated user.
- TC-B6-FDR-004: completion should fail when elapsed server-computed duration is below minimum threshold.
- TC-B6-FDR-005: valid completion should transition draft to `completed` and record focus session.
- TC-B6-FDR-006: replay completion should fail when draft is already `completed` or `invalidated`.

## Actual Result

- Pass (`6/6` in targeted file run).
- Coverage checkpoint pass (`npm --prefix backend run test:coverage`), global thresholds satisfied (`>=90%` gate).

## Trade-Off / Critical Thinking

- Benefit: closes subtle draft abuse vectors without reworking existing focus architecture.
- Limitation: no refresh-token/session revocation changes are introduced in this batch by design.
- Risk if skipped: replay/burst completion attempts and inconsistent draft lifecycle behavior could regress silently.
- Why unit test first: fastest deterministic way to validate state transitions and anti-cheat branch handling.

## Evidence

- Targeted batch command:
  - `npm --prefix backend test -- --runInBand backend/tests/unit/security/focusDraftBatch6.test.ts`
- Coverage command:
  - `npm --prefix backend run test:coverage`
- Files under test:
  - `backend/src/services/studyHealthService.ts`
  - `backend/src/controllers/focusController.ts`
  - `backend/src/routes/focusRoutes.ts`
- Batch test file:
  - `backend/tests/unit/security/focusDraftBatch6.test.ts`
