# Traceability Matrix (FR-01)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-01 | authSecurityService.ts | TC-ASEC-001 | Unit | Security | Covered | `getClientIp` prioritizes first `x-forwarded-for` IP when header contains multiple values. |
