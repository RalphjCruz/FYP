# Traceability Matrix (FR-08)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-08 | leaderboardService.ts | TC-LBSV-001 | Unit | Happy Path | Covered | `getGlobalLeaderboard` returns rank-ordered mapped entries with numeric normalization. |
| FR-08 | leaderboardService.ts | TC-LBSV-002 | Unit | Boundary | Covered | Limit fallback uses default `20` for zero/negative limits. |
| FR-08 | leaderboardService.ts | TC-LBSV-003 | Unit | Boundary | Covered | Limit fallback uses default `20` when requested limit exceeds `100`. |
| FR-08 | leaderboardService.ts | TC-LBSV-004 | Unit | Invalid Input | Covered | Limit fallback uses default `20` when limit is non-integer. |
| FR-08 | leaderboardService.ts | TC-LBSV-005 | Unit | Edge Case | Covered | Nullable aggregate fields map to safe defaults (`level=1`, other numerics `0`). |
| FR-08 | leaderboardService.ts | TC-LBSV-006 | Unit | Error Path | Covered | Service propagates query failures for upstream handling. |
| FR-08 | leaderboardController.ts | TC-LBCTRL-001 | Unit | Security | Covered | Controller returns `401` and exits early when authenticated user is missing. |
| FR-08 | leaderboardController.ts | TC-LBCTRL-002 | Unit | Happy Path | Covered | Controller parses numeric `limit` query and returns leaderboard payload. |
| FR-08 | leaderboardController.ts | TC-LBCTRL-003 | Unit | Invalid Input | Covered | Controller falls back malformed `limit` query values to default `20`. |
| FR-08 | leaderboardController.ts | TC-LBCTRL-004 | Unit | Error Path | Covered | Controller maps service `Error` failures to `500` with `Error.message`. |
| FR-08 | leaderboardController.ts | TC-LBCTRL-005 | Unit | Error Path | Covered | Controller maps non-`Error` service failures to fallback `500` leaderboard message. |
| FR-08 | leaderboardRoutes.ts + authMiddleware.ts + leaderboardController.ts | TC-LBINT-001 | Integration | Security | Covered | Route stack returns `401` for missing auth token before service call. |
| FR-08 | leaderboardRoutes.ts + authMiddleware.ts + leaderboardController.ts | TC-LBINT-002 | Integration | Security | Covered | Route stack returns `401` for invalid bearer token. |
| FR-08 | leaderboardRoutes.ts + authMiddleware.ts + leaderboardController.ts | TC-LBINT-003 | Integration | Route Flow | Covered | Route stack validates token, parses `limit`, and returns service payload for authenticated request. |
| FR-08 | leaderboardRoutes.ts + authMiddleware.ts + leaderboardController.ts | TC-LBINT-004 | Integration | Invalid Input | Covered | Route stack falls back malformed `limit` query and maps `Error` failure to `500`. |
| FR-08 | leaderboardRoutes.ts + authMiddleware.ts + leaderboardController.ts | TC-LBINT-005 | Integration | Error Path | Covered | Route stack maps non-`Error` service failures to fallback `500` message. |
