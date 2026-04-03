# Traceability Matrix (FR-09)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-09 | authMiddleware.ts | TC-MW-001 | Unit | Security | Covered | `OPTIONS` requests bypass auth and proceed to next middleware. |
| FR-09 | authMiddleware.ts | TC-MW-002 | Unit | Security | Covered | Missing bearer token returns `401` with controlled error message. |
| FR-09 | authMiddleware.ts | TC-MW-003 | Unit | Invalid Input | Covered | Malformed auth scheme (`Basic`) returns `401`; middleware does not call `next()`. |
| FR-09 | authMiddleware.ts | TC-MW-004 | Unit | Security | Covered | Invalid/expired bearer token returns `401` with safe error message. |
| FR-09 | authMiddleware.ts | TC-MW-005 | Unit | Happy Path | Covered | Valid bearer token attaches authenticated user and calls `next()`. |
| FR-09 | authMiddleware.ts | TC-MW-006 | Unit | Invalid Input | Covered | Token payload with invalid `sub` returns `401` invalid authentication token. |
| FR-09 | authMiddleware.ts | TC-MW-007 | Unit | Boundary | Covered | Token payload with `sub = "0"` is rejected with `401` invalid authentication token. |
