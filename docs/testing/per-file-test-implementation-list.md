# Per-File Test Implementation List

## Requirement Alignment (Must Match `requirements-fr-nfr.md`)

### Functional Requirements
- `FR-01 User Authentication` -> `authMiddleware.ts`, `controllers/validators/requestAuth.ts`, `controllers/validators/authRequestValidators.ts`, `authSecurityService.ts`, `authAccountService.ts`, `authController.ts`
- `FR-02 Task Management` -> `inputSanitizer.ts`, `controllers/validators/taskRequestValidators.ts`, `controllers/mappers/taskControllerErrorMapper.ts`, `taskService.ts`, `taskController.ts`
- `FR-03 XP Progression` -> `xpService.ts`, `taskService.ts`, `slimeProfileService.ts`, `slimeController.ts`
- `FR-04 Achievements` -> `achievementService.ts`, `customizationController.ts`, `slimeController.ts` (dev reset behavior validation)
- `FR-05 Focus System` -> `controllers/validators/focusRequestValidators.ts`, `studyHealthService.ts`, `focusController.ts`
- `FR-06 Customization` -> `controllers/validators/customizationRequestValidators.ts`, `controllers/mappers/customizationErrorMapper.ts`, `customizationService.ts`, `customizationController.ts`
- `FR-07 Analytics` -> `analyticsService.ts`, `analyticsController.ts`
- `FR-08 Leaderboard` -> `leaderboardService.ts`, `leaderboardController.ts`
- `FR-09 Security / Dev Gating` -> `authMiddleware.ts`, `taskController.ts` (dev reset route), `focusController.ts` (dev routes), `customizationController.ts` (dev routes), `slimeController.ts` (dev routes), `slimeDevService.ts`, production-gating integration tests
- `FR-10 Account Data Export (Privacy)` -> `requestRateLimitService.ts`, `accountService.ts`, `accountController.ts`, `accountRoutes.ts`
- `FR-11 Account Deletion Lifecycle (Privacy)` -> `accountDeletionService.ts`, `accountController.ts`, `accountRoutes.ts`, `operationalAuditLogService.ts`
- `FR-12 Account Purge & Retention Jobs (Privacy)` -> `accountRetentionService.ts`, `accountDeletionService.ts`, `operationalAuditLogService.ts`
- `FR-13 Rate-Limit Key Normalization & Response Contract` -> `requestRateLimitService.ts`, `authController.ts`, `accountController.ts`
- `FR-14 Focus Draft Lifecycle & Anti-Cheat` -> `studyHealthService.ts`, `focusController.ts`, `focusRoutes.ts`

### Non-Functional Requirements
- `NFR-01 Security` -> auth/authorization/error-leakage paths in unit + integration tests
- `NFR-02 Reliability` -> transaction + idempotency + duplicate-operation tests
- `NFR-03 Performance` -> bounded-query tests (limits/defaults) + response-time smoke checks
- `NFR-04 Maintainability` -> strict traceability updates after each file checkpoint

## Coverage Scope Notes
- `src/controllers/**/*`, `src/services/**/*`, `src/middlewares/**/*`, and `src/utils/**/*` are in coverage scope.
- `src/services/userService.ts` is currently excluded in Jest config and treated as out-of-scope unless coverage config changes.
- `controllers/validators/*` and `controllers/mappers/*` are in scope and must be tested.

## Order (one file at a time)
1. `src/utils/inputSanitizer.ts` (Done)
2. `src/middlewares/authMiddleware.ts` (Done, unit scope)
3. `src/services/authSecurityService.ts` (In progress)
4. `src/controllers/validators/authRequestValidators.ts`
5. `src/services/authAccountService.ts`
6. `src/controllers/authController.ts`
7. `src/controllers/validators/requestAuth.ts`
8. `src/controllers/validators/taskRequestValidators.ts`
9. `src/controllers/mappers/taskControllerErrorMapper.ts`
10. `src/services/taskService.ts`
11. `src/controllers/taskController.ts`
12. `src/services/xpService.ts`
13. `src/controllers/validators/slimeRequestValidators.ts`
14. `src/services/slimeProfileService.ts`
15. `src/services/slimeDevService.ts`
16. `src/controllers/slimeController.ts`
17. `src/controllers/validators/focusRequestValidators.ts`
18. `src/services/studyHealthService.ts`
19. `src/controllers/focusController.ts`
20. `src/controllers/validators/customizationRequestValidators.ts`
21. `src/controllers/mappers/customizationErrorMapper.ts`
22. `src/services/customizationService.ts`
23. `src/services/achievementService.ts`
24. `src/controllers/customizationController.ts`
25. `src/services/analyticsService.ts`
26. `src/controllers/analyticsController.ts`
27. `src/services/leaderboardService.ts`
28. `src/controllers/leaderboardController.ts`
29. Integration tests (security/transactions/route flow/dev gating/performance smoke)

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
  - `traceability-matrix-FR01.md` / `traceability-matrix-FR02.md` / ... / `traceability-matrix-FR14.md` as applicable
  - checkpoint summary in `docs/testing/checkpoints/`
- No test file is considered complete until traceability row(s) exist.
