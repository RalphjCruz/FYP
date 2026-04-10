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
| FR-09 | slimeDevService.ts | TC-SDEV-001 | Unit | Happy Path | Covered | Dev XP add flow returns level snapshot merged with newly unlocked achievements. |
| FR-09 | slimeDevService.ts | TC-SDEV-002 | Unit | Reliability | Covered | Dev XP reset delegates directly to XP reset service for user-scoped state reset. |
| FR-09 | slimeDevService.ts | TC-SDEV-003 | Unit | Reliability | Covered | Dev achievement reset delegates directly to achievement reset service for user-scoped cleanup. |
| FR-09 | slimeDevService.ts | TC-SDEV-004 | Unit | Idempotency | Covered | Existing test user/slime flow returns stable records without creating duplicates. |
| FR-09 | slimeDevService.ts | TC-SDEV-005 | Unit | State Transition | Covered | Missing test user/slime flow creates both records in one committed transaction. |
| FR-09 | slimeDevService.ts | TC-SDEV-006 | Unit | Error Path | Covered | Transaction rolls back and rethrows when user/slime creation flow encounters query failure. |
| FR-09 | slimeController.ts | TC-SCTRL-007 | Unit | Security | Covered | `addSlimeXpDev` exits early when authenticated user is missing. |
| FR-09 | slimeController.ts | TC-SCTRL-008 | Unit | Boundary | Covered | `addSlimeXpDev` defaults invalid XP amount to fallback value `50`. |
| FR-09 | slimeController.ts | TC-SCTRL-009 | Unit | Error Path | Covered | `addSlimeXpDev` maps non-`Error` failures to fallback `400` response message. |
| FR-09 | slimeController.ts | TC-SCTRL-010 | Unit | Reliability | Covered | Dev reset endpoints return success payloads and `400` fallback responses on non-`Error` failures. |
| FR-09 | slimeController.ts | TC-SCTRL-011 | Unit | State Transition | Covered | `createTestUser` returns created/existing messages and maps non-`Error` failures to unknown-error response. |
| FR-09 | slimeController.ts | TC-SCTRL-012 | Unit | Reliability | Covered | `healthCheck` returns healthy payload on success and unhealthy payload on DB failure. |
| FR-09 | slimeController.ts | TC-SCTRL-013 | Unit | Error Path | Covered | `addSlimeXpDev` maps `Error` failures to message-preserving `400` response payload. |
| FR-09 | slimeController.ts | TC-SCTRL-014 | Unit | Security | Covered | `resetSlimeXpDev` exits early when authenticated user is missing. |
| FR-09 | slimeController.ts | TC-SCTRL-015 | Unit | Error Path | Covered | `resetSlimeXpDev` maps `Error` failures to message-preserving `400` response payload. |
| FR-09 | slimeController.ts | TC-SCTRL-016 | Unit | Security | Covered | `resetSlimeAchievementsDev` exits early when authenticated user is missing. |
| FR-09 | slimeController.ts | TC-SCTRL-017 | Unit | Error Path | Covered | `resetSlimeAchievementsDev` maps `Error` failures to message-preserving `400` response payload. |
| FR-09 | slimeController.ts | TC-SCTRL-018 | Unit | Reliability | Covered | `createTestUser`/`healthCheck` map `Error` and non-`Error` failures to safe fallback response messages. |
| FR-09 | slimeroutes.ts + authMiddleware.ts | TC-SDGINT-001 | Integration | Security | Covered | Production slime router blocks `/test-user` dev route with `404` route-not-found response. |
| FR-09 | slimeroutes.ts + authMiddleware.ts | TC-SDGINT-002 | Integration | Security | Covered | Production slime router blocks `/me/dev-xp` with `404` even when bearer token is provided. |
| FR-09 | slimeroutes.ts + authMiddleware.ts | TC-SDGINT-003 | Integration | Security | Covered | Production slime router blocks `/me/dev-reset-xp` with `404` route-not-found response. |
| FR-09 | slimeroutes.ts + authMiddleware.ts | TC-SDGINT-004 | Integration | Security | Covered | Production slime router blocks `/me/dev-reset-achievements` with `404` route-not-found response. |
| FR-09 | slimeroutes.ts + authMiddleware.ts | TC-SDGINT-005 | Integration | Security | Covered | Non-dev `/me` route remains auth-protected and returns `401` when token is missing. |
| FR-09 | taskRoutes.ts + authMiddleware.ts | TC-SDGINT-006 | Integration | Security | Covered | Production task router blocks `/dev-reset` with `404` route-not-found response even with valid bearer token. |
| FR-09 | focusRoutes.ts + authMiddleware.ts | TC-SDGINT-007 | Integration | Security | Covered | Production focus router blocks `/dev/settle` with `404` route-not-found response even with valid bearer token. |
| FR-09 | focusRoutes.ts + authMiddleware.ts | TC-SDGINT-008 | Integration | Security | Covered | Production focus router blocks `/dev/reset-progress` with `404` route-not-found response even with valid bearer token. |
| FR-09 | customizationRoutes.ts + authMiddleware.ts | TC-SDGINT-009 | Integration | Security | Covered | Production customization router blocks `/wallet/dev-add` with app-level `404` route-not-found response. |
| FR-09 | customizationRoutes.ts + authMiddleware.ts | TC-SDGINT-010 | Integration | Security | Covered | Production customization router blocks `/wallet/dev-reset` with app-level `404` route-not-found response. |
| FR-09 | customizationRoutes.ts + authMiddleware.ts | TC-SDGINT-011 | Integration | Security | Covered | Production customization router blocks `/dev/reset-progress` with app-level `404` route-not-found response. |
