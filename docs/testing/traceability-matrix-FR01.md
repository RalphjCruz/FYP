# Traceability Matrix (FR-01)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-01 | authSecurityService.ts | TC-ASEC-001 | Unit | Security | Covered | `getClientIp` prioritizes first `x-forwarded-for` IP when header contains multiple values. |
| FR-01 | authSecurityService.ts | TC-ASEC-002 | Unit | Edge Case | Covered | `getClientIp` supports array-form forwarded header and returns first entry. |
| FR-01 | authSecurityService.ts | TC-ASEC-003 | Unit | Happy Path | Covered | `getClientIp` falls back to request IP when forwarded header is absent. |
| FR-01 | authSecurityService.ts | TC-ASEC-004 | Unit | Invalid Input | Covered | `getClientIp` returns `"unknown"` when both forwarded header and request IP are missing. |
