# Traceability Matrix (FR-14)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-14 | studyHealthService.ts | TC-B6-FDR-001 | Unit | State Transition | Covered | New draft start invalidates prior active draft before creating the next active draft. |
| FR-14 | studyHealthService.ts | TC-B6-FDR-002 | Unit | Branch Path | Covered | Start flow preserves one-active-draft lifecycle by ordering invalidate then insert. |
| FR-14 | studyHealthService.ts | TC-B6-FDR-003 | Unit | Security | Covered | Completion rejects when referenced active draft does not exist for user. |
| FR-14 | studyHealthService.ts | TC-B6-FDR-004 | Unit | Anti-Cheat | Covered | Completion enforces minimum session duration from server-authoritative elapsed time. |
| FR-14 | studyHealthService.ts | TC-B6-FDR-005 | Unit | State Transition | Covered | Completion marks draft as `completed` and records a focus session on valid completion. |
| FR-14 | studyHealthService.ts | TC-B6-FDR-006 | Unit | Replay Protection | Covered | Completion rejects replay when draft status is already `completed` or `invalidated`. |
