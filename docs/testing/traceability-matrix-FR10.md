# Traceability Matrix (FR-10)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-10 | accountService.ts | TC-B2-EXP-001 | Unit | Security | Covered | `buildAccountDataExport` keeps export queries scoped to authenticated `userId` filters. |
| FR-10 | accountService.ts | TC-B2-EXP-002 | Unit | Happy Path | Covered | `buildAccountDataExport` returns structured JSON grouped by domain entities. |
| FR-10 | accountService.ts | TC-B2-EXP-003 | Unit | Edge Case | Covered | `buildAccountDataExport` returns safe null/empty domain values when optional tables are absent. |
| FR-10 | accountController.ts | TC-B2-EXP-004 | Unit | Security | Covered | `exportAccountDataController` returns `401` when authenticated user is missing. |
| FR-10 | accountController.ts + requestRateLimitService.ts | TC-B2-EXP-005 | Unit | Security | Covered | `exportAccountDataController` enforces cooldown and returns `429` with `Retry-After` when exceeded. |
| FR-10 | accountController.ts | TC-B2-EXP-006 | Unit | Happy Path | Covered | `exportAccountDataController` returns export payload for authenticated active user under limit. |
