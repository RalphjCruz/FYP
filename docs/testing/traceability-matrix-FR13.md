# Traceability Matrix (FR-13)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-13 | requestRateLimitService.ts | TC-B5-RL-001 | Unit | Data Normalization | Covered | `normalizeEmailForRateLimit` trims/lowercases email before key generation. |
| FR-13 | requestRateLimitService.ts | TC-B5-RL-002 | Unit | Consistency | Covered | Login key generation stays stable for equivalent normalized email variants. |
| FR-13 | requestRateLimitService.ts | TC-B5-RL-003 | Unit | Key Integrity | Covered | Protected-route key includes normalized `ip:user_id:route_id` tuple and changes with tuple changes. |
| FR-13 | authController.ts | TC-B5-RL-004 | Unit | Security | Covered | Locked-login response returns `429` with `Retry-After` header. |
| FR-13 | authController.ts | TC-B5-RL-005 | Unit | Security | Covered | Lock-threshold branch returns `429` with `Retry-After` header. |
| FR-13 | authController.ts + requestRateLimitService.ts | TC-B5-RL-006 | Unit | Rate Limiting | Covered | Login request-rate-limit branch returns `429` with `Retry-After` when exceeded. |
