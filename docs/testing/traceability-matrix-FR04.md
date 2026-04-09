# Traceability Matrix (FR-04)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-04 | achievementService.ts | TC-ACH-001 | Unit | Invalid Input | Covered | Filters unsupported achievement keys from DB rows before returning response payload. |
| FR-04 | achievementService.ts | TC-ACH-002 | Unit | Happy Path | Covered | Maps unlocked achievements while preserving locked defaults in progress output. |
| FR-04 | achievementService.ts | TC-ACH-003 | Unit | Reliability | Covered | Evaluates unlock conditions and inserts only newly qualified achievements. |
| FR-04 | achievementService.ts | TC-ACH-004 | Unit | Edge Case | Covered | Returns empty unlock list when no rule thresholds are met. |
| FR-04 | achievementService.ts | TC-ACH-005 | Unit | Boundary | Covered | Normalizes delete row count fallback to zero for reset response safety. |
| FR-04 | achievementService.ts | TC-ACH-006 | Unit | Reliability | Covered | Validates transaction wrapper commit/rollback behavior for reset flow. |
| FR-04 | achievementService.ts | TC-ACH-007 | Unit | Happy Path | Covered | Pool-backed `getUserAchievements` wrapper returns mapped user achievement rows. |
| FR-04 | achievementService.ts | TC-ACH-008 | Unit | Happy Path | Covered | Pool-backed `getAchievementProgress` wrapper returns unlock state and locked defaults. |
| FR-04 | achievementService.ts | TC-ACH-009 | Unit | Reliability | Covered | `evaluateAndUnlockAchievements` transactional wrapper commits on success and rolls back on failure. |
| FR-04 | achievementService.ts | TC-ACH-010 | Unit | Error Path | Covered | Schema init failure resets cached promise and retries successfully on next call. |
| FR-04 | achievementService.ts | TC-ACH-011 | Unit | Edge Case | Covered | Missing stats rows default to safe baseline values and yield no unlocks. |
