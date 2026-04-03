# Traceability Matrix (Template)

| Requirement ID | Function/File     | Test Case ID | Test Type   | Scenario Type | Coverage Status | Notes                          |
| --- | --- | --- | --- | --- | --- | --- |
| FR-02 | inputSanitizer.ts | TC-UTIL-001 | Unit | Invalid Input | Covered | `sanitizeText` removes control chars and trims by default. |
| FR-02 | inputSanitizer.ts | TC-UTIL-002 | Unit | Edge Case | Covered | `sanitizeText` collapses whitespace when option enabled. |
| FR-02 | inputSanitizer.ts | TC-UTIL-003 | Unit | Branch Path | Covered | `sanitizeText` respects `trim=false`. |
| FR-02 | inputSanitizer.ts | TC-UTIL-004 | Unit | Boundary | Covered | `maxLength` applies only for positive integer values. |
| FR-02 | inputSanitizer.ts | TC-UTIL-005 | Unit | Invalid Input | Covered | non-string values sanitize to empty string. |
| FR-02 | inputSanitizer.ts | TC-UTIL-006 | Unit | Happy Path | Covered | `sanitizeEmail` trims/collapses/lowercases correctly. |
| FR-02 | inputSanitizer.ts | TC-UTIL-007 | Unit | Invalid Input | Covered | `sanitizeSlug` accepts valid slug and rejects invalid slug. |
| FR-02 | inputSanitizer.ts | TC-UTIL-008 | Unit | Invalid Input | Covered | `parseInteger` returns fallback value for malformed numeric input. |
| FR-02 | inputSanitizer.ts | TC-UTIL-009 | Unit | Boundary | Covered | `parsePositiveInteger` accepts positive only; rejects zero/negative/invalid. |
| FR-02 | inputSanitizer.ts | TC-UTIL-010 | Unit | Boundary | Covered | `clampNumber` enforces min/max bounds. |

