# Traceability Matrix (FR-01)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-01 | authSecurityService.ts | TC-ASEC-001 | Unit | Security | Covered | `getClientIp` prioritizes first `x-forwarded-for` IP when header contains multiple values. |
| FR-01 | authSecurityService.ts | TC-ASEC-002 | Unit | Edge Case | Covered | `getClientIp` supports array-form forwarded header and returns first entry. |
| FR-01 | authSecurityService.ts | TC-ASEC-003 | Unit | Happy Path | Covered | `getClientIp` falls back to request IP when forwarded header is absent. |
| FR-01 | authSecurityService.ts | TC-ASEC-004 | Unit | Invalid Input | Covered | `getClientIp` returns `"unknown"` when both forwarded header and request IP are missing. |
| FR-01 | authSecurityService.ts | TC-ASEC-005 | Unit | Boundary | Covered | `getLoginSecurityPolicy` returns fixed max attempts and lock/window minute values. |
| FR-01 | authSecurityService.ts | TC-ASEC-006 | Unit | Edge Case | Covered | `getClientIp` ignores blank forwarded header and falls back to request IP. |
| FR-01 | authSecurityService.ts | TC-ASEC-007 | Unit | Edge Case | Covered | `getClientIp` falls back to request IP when forwarded array first entry is blank. |
| FR-01 | authSecurityService.ts | TC-ASEC-008 | Unit | Edge Case | Covered | `getClientIp` falls back to request IP when forwarded string first comma segment is blank. |
| FR-01 | authSecurityService.ts | TC-ASEC-009 | Unit | Happy Path | Covered | `getClientIp` trims and returns single forwarded IP value. |
| FR-01 | authSecurityService.ts | TC-ASEC-010 | Unit | Reliability | Covered | `getLoginSecurityPolicy` returns a fresh object per call; external mutation does not persist. |
| FR-01 | authSecurityService.ts | TC-ASEC-011 | Unit | Edge Case | Covered | `getClientIp` falls back to request IP when forwarded header array is empty. |
| FR-01 | authSecurityService.ts | TC-ASEC-012 | Unit | Security | Covered | `logAuthAuditEvent` persists expected auth event payload to audit log insert query. |
| FR-01 | authSecurityService.ts | TC-ASEC-013 | Unit | Security | Covered | `getLoginSecurityStatus` reports active lock state and avoids guard reset update while locked. |
| FR-01 | authSecurityService.ts | TC-ASEC-014 | Unit | Boundary | Covered | `getLoginSecurityStatus` resets expired lock/window state and returns unlocked status. |
| FR-01 | authSecurityService.ts | TC-ASEC-015 | Unit | Security | Covered | `recordFailedLoginAttempt` increments attempts in-window and writes `login_failure` audit event. |
| FR-01 | authSecurityService.ts | TC-ASEC-016 | Unit | Security | Covered | `recordFailedLoginAttempt` locks account at threshold and writes `login_locked` audit event. |
| FR-01 | authSecurityService.ts | TC-ASEC-017 | Unit | Security | Covered | `recordFailedLoginAttempt` preserves active lock state, skips increment, and logs `login_blocked_locked`. |
| FR-01 | authSecurityService.ts | TC-ASEC-018 | Unit | Happy Path | Covered | `getLoginSecurityStatus` auto-creates missing guard row and returns default unlocked status. |
| FR-01 | authSecurityService.ts | TC-ASEC-019 | Unit | Reliability | Covered | `clearLoginFailures` resets guard failure count and lock state via guard update. |
| FR-01 | authSecurityService.ts | TC-ASEC-020 | Unit | Boundary | Covered | `recordFailedLoginAttempt` resets expired window and restarts failure count from one. |
| FR-01 | authSecurityService.ts | TC-ASEC-021 | Unit | Edge Case | Covered | `logAuthAuditEvent` persists `details` as null when optional details are omitted. |
| FR-01 | authSecurityService.ts | TC-ASEC-022 | Unit | Boundary | Covered | `getLoginSecurityStatus` reports zero in-window attempts when lock is active and window timestamp is stale. |
| FR-01 | authSecurityService.ts | TC-ASEC-023 | Unit | Edge Case | Covered | `recordFailedLoginAttempt` writes `login_failure` audit event with null `user_id` when userId is omitted. |
| FR-01 | authRequestValidators.ts | TC-ARV-001 | Unit | Happy Path | Covered | `parseRegistrationEmailForAudit` normalizes registration email for audit logging. |
| FR-01 | authRequestValidators.ts | TC-ARV-002 | Unit | Invalid Input | Covered | `parseRegistrationEmailForAudit` returns empty string when email is missing or non-string. |
| FR-01 | authRequestValidators.ts | TC-ARV-003 | Unit | Invalid Input | Covered | `validateRegistrationPayload` rejects usernames shorter than 3 characters. |
| FR-01 | authRequestValidators.ts | TC-ARV-004 | Unit | Invalid Input | Covered | `validateRegistrationPayload` rejects invalid email format. |
| FR-01 | authRequestValidators.ts | TC-ARV-005 | Unit | Invalid Input | Covered | `validateRegistrationPayload` rejects passwords shorter than 8 characters. |
| FR-01 | authRequestValidators.ts | TC-ARV-006 | Unit | Happy Path | Covered | `validateRegistrationPayload` returns normalized username/email and valid password when input is valid. |
| FR-01 | authRequestValidators.ts | TC-ARV-007 | Unit | Happy Path | Covered | `parseLoginPayload` normalizes email and preserves password spacing according to sanitizer options. |
| FR-01 | authRequestValidators.ts | TC-ARV-008 | Unit | Happy Path | Covered | `isValidLoginPayload` returns true for valid email format and non-empty password. |
| FR-01 | authRequestValidators.ts | TC-ARV-009 | Unit | Invalid Input | Covered | `isValidLoginPayload` returns false when email format is invalid. |
| FR-01 | authRequestValidators.ts | TC-ARV-010 | Unit | Invalid Input | Covered | `isValidLoginPayload` returns false when password is empty. |
| FR-01 | authAccountService.ts | TC-AAS-001 | Unit | Happy Path | Covered | `findUserCredentialsByEmail` maps DB row into auth credentials contract. |
| FR-01 | authAccountService.ts | TC-AAS-002 | Unit | Invalid Input | Covered | `findUserCredentialsByEmail` returns null when query finds no matching user. |
| FR-01 | authAccountService.ts | TC-AAS-003 | Unit | Happy Path | Covered | `isPasswordMatch` returns true when bcrypt compare resolves true. |
| FR-01 | authAccountService.ts | TC-AAS-004 | Unit | Invalid Input | Covered | `isPasswordMatch` returns false when bcrypt compare resolves false. |
| FR-01 | authAccountService.ts | TC-AAS-005 | Unit | Happy Path | Covered | `getUserProfileById` maps DB row into public profile contract. |
| FR-01 | authAccountService.ts | TC-AAS-006 | Unit | Invalid Input | Covered | `getUserProfileById` returns null when query finds no matching user profile. |
| FR-01 | authAccountService.ts | TC-AAS-007 | Unit | Happy Path | Covered | `registerUserWithSlime` creates user/slime records, commits transaction, and returns mapped public user payload. |
| FR-01 | authAccountService.ts | TC-AAS-008 | Unit | Invalid Input | Covered | `registerUserWithSlime` rolls back and throws `EMAIL_IN_USE` on duplicate email constraint violation. |
| FR-01 | authAccountService.ts | TC-AAS-009 | Unit | Invalid Input | Covered | `registerUserWithSlime` rolls back and throws `USERNAME_IN_USE` on duplicate username constraint violation. |
| FR-01 | authAccountService.ts | TC-AAS-010 | Unit | Invalid Input | Covered | `registerUserWithSlime` rolls back and throws `USER_EXISTS` for generic duplicate key violation detail. |
| FR-01 | authAccountService.ts | TC-AAS-011 | Unit | Error Path | Covered | `registerUserWithSlime` rolls back and rethrows unexpected non-duplicate errors. |
| FR-01 | authAccountService.ts | TC-AAS-012 | Unit | Reliability | Covered | `registerUserWithSlime` resets user-scoped progress and upserts default customization wallet when scoped tables exist. |
| FR-01 | authController.ts | TC-ACTRL-001 | Unit | Invalid Input | Covered | `login` returns `400` when email format is invalid. |
| FR-01 | authController.ts | TC-ACTRL-002 | Unit | Invalid Input | Covered | `login` returns `400` when password is empty. |
| FR-01 | authController.ts | TC-ACTRL-003 | Unit | Security | Covered | `getMe` returns `401` when authenticated user id is missing. |
| FR-01 | authController.ts | TC-ACTRL-004 | Unit | Invalid Input | Covered | `getMe` returns `404` when authenticated user profile is not found. |
| FR-01 | authController.ts | TC-ACTRL-005 | Unit | Happy Path | Covered | `getMe` returns public profile payload when authenticated user exists. |
| FR-01 | authController.ts | TC-ACTRL-006 | Unit | Security | Covered | `login` returns `429` with lock metadata when account is currently locked. |
| FR-01 | authController.ts | TC-ACTRL-007 | Unit | Invalid Input | Covered | `login` returns `401` when user is not found and failed attempt does not lock account. |
| FR-01 | authController.ts | TC-ACTRL-008 | Unit | Security | Covered | `login` returns `429` when missing-user failed attempt triggers lockout threshold. |
| FR-01 | authController.ts | TC-ACTRL-009 | Unit | Invalid Input | Covered | `login` returns `401` when password check fails and failed attempt does not lock account. |
| FR-01 | authController.ts | TC-ACTRL-010 | Unit | Happy Path | Covered | `login` returns success payload with token when credentials are valid. |
| FR-01 | authController.ts | TC-ACTRL-011 | Unit | Error Path | Covered | `login` returns `500` and logs `login_failure` on unexpected errors. |
| FR-01 | authController.ts | TC-ACTRL-012 | Unit | Invalid Input | Covered | `register` returns `400` and logs `register_failed` when registration payload is invalid. |
| FR-01 | authController.ts | TC-ACTRL-013 | Unit | Invalid Input | Covered | `register` returns `409` when account service raises `EMAIL_IN_USE`. |
| FR-01 | authController.ts | TC-ACTRL-014 | Unit | Invalid Input | Covered | `register` returns `409` when account service raises `USERNAME_IN_USE`. |
| FR-01 | authController.ts | TC-ACTRL-015 | Unit | Duplicate | Covered | `register` returns `409` when account service raises generic `USER_EXISTS`. |
| FR-01 | authController.ts | TC-ACTRL-016 | Unit | Security | Covered | `login` returns `429` when wrong-password failed attempt reaches lockout threshold. |
| FR-01 | authController.ts | TC-ACTRL-017 | Unit | Happy Path | Covered | `register` returns `201` with token + user payload and logs `register_success`. |
| FR-01 | authController.ts | TC-ACTRL-018 | Unit | Error Path | Covered | `register` returns `500` and logs `register_failed` on unexpected service errors. |
| FR-01 | authController.ts | TC-ACTRL-019 | Unit | Error Path | Covered | `getMe` returns `500` when profile lookup throws unexpected error. |
| FR-01 | authController.ts | TC-ACTRL-020 | Unit | Boundary | Covered | `login` locked branch returns `minutesRemaining: 0` when `lockedUntil` is null. |
| FR-01 | authController.ts | TC-ACTRL-021 | Unit | Boundary | Covered | `login` locked branch returns `minutesRemaining: 0` when `lockedUntil` timestamp is already expired. |
| FR-01 | authController.ts | TC-ACTRL-022 | Unit | Reliability | Covered | `register` invalid-payload branch still returns `400` when audit logging fails. |
| FR-01 | authController.ts | TC-ACTRL-023 | Unit | Reliability | Covered | `login` locked-account branch still returns `429` when audit logging fails. |
| FR-01 | authController.ts | TC-ACTRL-024 | Unit | Reliability | Covered | `login` unexpected-error branch still returns `500` when audit logging also fails. |
| FR-01 | requestAuth.ts | TC-RAUTH-001 | Unit | Happy Path | Covered | `getAuthenticatedUserId` returns user id when `req.user.id` exists. |
| FR-01 | requestAuth.ts | TC-RAUTH-002 | Unit | Security | Covered | `requireAuthenticatedUserId` returns `401` with default message when authenticated user id is missing. |
| FR-01 | requestAuth.ts | TC-RAUTH-003 | Unit | Happy Path | Covered | `requireAuthenticatedUserId` returns user id and does not write unauthorized response when auth context exists. |
| FR-01 | authRoutes.ts + authMiddleware.ts + authController.ts | TC-AUTHINT-001 | Integration | Security | Covered | `/api/auth/me` route stack returns `401` for missing auth token. |
| FR-01 | authRoutes.ts + authMiddleware.ts + authController.ts | TC-AUTHINT-002 | Integration | Security | Covered | `/api/auth/me` route stack returns `401` for invalid bearer token. |
| FR-01 | authRoutes.ts + authMiddleware.ts + authController.ts | TC-AUTHINT-003 | Integration | Route Flow | Covered | `/api/auth/me` route stack returns authenticated profile payload when user exists. |
| FR-01 | authRoutes.ts + authMiddleware.ts + authController.ts | TC-AUTHINT-004 | Integration | Invalid Input | Covered | `/api/auth/me` route stack returns `404` when authenticated profile is not found. |
| FR-01 | authRoutes.ts + authMiddleware.ts + authController.ts | TC-AUTHINT-005 | Integration | Error Path | Covered | `/api/auth/me` route stack maps unexpected profile lookup failures to `500`. |
