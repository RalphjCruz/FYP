# Per-File Test Implementation List

## Requirement Alignment (Must Match `requirements-fr-nfr.md`)

### Functional Requirements
- `FR-01 User Authentication` -> `authController.ts`, `authMiddleware.ts`, `authSecurityService.ts`
- `FR-02 Task Management` -> `taskController.ts`
- `FR-03 XP Progression` -> `xpService.ts`, `taskController.ts`
- `FR-04 Achievements` -> `achievementService.ts`
- `FR-05 Focus System` -> `focusController.ts`, `studyHealthService.ts`
- `FR-06 Customization` -> `customizationController.ts`, `customizationService.ts`
- `FR-07 Analytics` -> `analyticsController.ts`, `analyticsService.ts`
- `FR-08 Leaderboard` -> `leaderboardController.ts`, `leaderboardService.ts`
- `FR-09 Security / Dev Gating` -> production-gating integration tests for dev-only routes

### Non-Functional Requirements
- `NFR-01 Security` -> auth/authorization/error-leakage paths in unit + integration tests
- `NFR-02 Reliability` -> transaction + idempotency + duplicate-operation tests
- `NFR-03 Performance` -> bounded-query tests (limits/defaults) + response-time smoke checks
- `NFR-04 Maintainability` -> strict traceability updates after each file checkpoint

## Order (one file at a time)
1. `src/utils/inputSanitizer.ts`
2. `src/middlewares/authMiddleware.ts`
3. `src/services/authSecurityService.ts`
4. `src/controllers/authController.ts`
5. `src/services/xpService.ts`
6. `src/controllers/taskController.ts`
7. `src/controllers/slimeController.ts`
8. `src/controllers/focusController.ts`
9. `src/services/studyHealthService.ts`
10. `src/controllers/customizationController.ts`
11. `src/services/customizationService.ts`
12. `src/services/achievementService.ts`
13. `src/controllers/analyticsController.ts`
14. `src/services/analyticsService.ts`
15. `src/controllers/leaderboardController.ts`
16. `src/services/leaderboardService.ts`
17. Integration tests (security/transactions/route flow/dev gating/performance smoke)

## Per-file scenario set
- Happy path
- Edge cases
- Boundary conditions
- Invalid inputs
- Duplicate/concurrency behavior
- Error paths (400/401/403/500)
- Branch paths (if/else, switch, try/catch)
- State transitions (before -> action -> after validation)
- Idempotency (repeated requests produce no additional effect)
- Input variation:
  - null / undefined
  - empty values
  - max/min limits
  - malformed types
- Security paths (unauthorized, invalid token, forbidden access)
- Output validation:
  - correct return values
  - correct state updates
  - correct error responses

## FR-09 Dev Gating Coverage (Required)
- Production mode must block dev-only routes:
  - slime dev endpoints
  - task dev reset endpoint
  - focus dev endpoints
  - customization dev endpoints
- Validate blocked routes return safe non-sensitive error responses.

## Integration trigger
Use integration tests only when:
- DB state must be verified
- transactions must be validated
- controller + middleware + service flow must be tested

## NFR-03 Performance Coverage (Required)
- Validate bounded inputs/defaults for query limits (for example leaderboard `limit` fallback behavior).
- Add lightweight response-time smoke checks for key endpoints under local test conditions.

## NFR-04 Maintainability Coverage (Required)
- After each file checkpoint, update:
  - `traceability-matrix.md`
  - checkpoint summary (FRs covered, TCs added, gaps, risks)
- No test file is considered complete until traceability row(s) exist.
