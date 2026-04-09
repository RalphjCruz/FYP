# Traceability Matrix (FR-03)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-03 | xpService.ts | TC-XP-001 | Unit | Boundary | Covered | XP progression math validates per-level XP growth and cumulative XP floors. |
| FR-03 | xpService.ts | TC-XP-002 | Unit | Edge Case | Covered | Snapshot builder normalizes negative XP and computes level/evolution/progress boundaries. |
| FR-03 | xpService.ts | TC-XP-003 | Unit | Invalid Input | Covered | `addXpToSlimeWithClient` rejects non-positive XP and missing slime rows. |
| FR-03 | xpService.ts | TC-XP-004 | Unit | Happy Path | Covered | `addXpToSlimeWithClient` updates slime XP state and logs XP event in table. |
| FR-03 | xpService.ts | TC-XP-005 | Unit | Reliability | Covered | `syncSlimeLevelFromStoredExperience` and `resetSlimeXpWithClient` update state and clear XP events. |
| FR-03 | xpService.ts | TC-XP-006 | Unit | Reliability | Covered | Transaction wrappers commit on success and rollback on failures for add/reset XP flows. |
| FR-03 | xpService.ts | TC-XP-007 | Unit | Boundary | Covered | `addXpToSlimeWithClient` defaults nullish stored XP to `0` before adding new XP. |
| FR-03 | slimeRequestValidators.ts | TC-SRV-001 | Unit | Invalid Input | Covered | `parseUserId` returns `null` when route/auth user id input is missing. |
| FR-03 | slimeRequestValidators.ts | TC-SRV-002 | Unit | Happy Path | Covered | `parseUserId` selects and parses the first value from array-form route params. |
| FR-03 | slimeRequestValidators.ts | TC-SRV-003 | Unit | Invalid Input | Covered | `parseUserId` rejects non-positive and malformed user id values. |
| FR-03 | slimeRequestValidators.ts | TC-SRV-004 | Unit | Boundary | Covered | `parseSimulatedDayOffset` clamps offsets within `-365..365`. |
| FR-03 | slimeRequestValidators.ts | TC-SRV-005 | Unit | Invalid Input | Covered | `parseSimulatedDayOffset` returns `0` for malformed input values. |
| FR-03 | slimeRequestValidators.ts | TC-SRV-006 | Unit | Security | Covered | `resolveSimulatedNowUtc` disables simulated time in production/zero-offset and allows dev-time offset. |
| FR-03 | slimeProfileService.ts | TC-SPS-001 | Unit | Happy Path | Covered | Builds complete slime stats payload and includes only unlocked achievements with timestamps. |
| FR-03 | slimeProfileService.ts | TC-SPS-002 | Unit | Boundary | Covered | Forwards `simulatedNowUtc` into study-health snapshot resolution. |
| FR-03 | slimeProfileService.ts | TC-SPS-003 | Unit | Invalid Input | Covered | Throws `SLIME_NOT_FOUND` when slime row does not exist for user. |
| FR-03 | slimeProfileService.ts | TC-SPS-004 | Unit | Edge Case | Covered | Defaults nullish stored slime experience to `0` before XP-level sync. |
| FR-03 | slimeProfileService.ts | TC-SPS-005 | Unit | Reliability | Covered | Propagates not-found error when second slime fetch fails mid-build sequence. |
| FR-03 | slimeProfileService.ts | TC-SPS-006 | Unit | State Transition | Covered | Ensures achievement evaluation runs before progress fetch during payload rebuild. |
| FR-03 | slimeController.ts | TC-SCTRL-001 | Unit | Invalid Input | Covered | `getSlimeStats` returns `400` when neither authenticated nor route user id is valid. |
| FR-03 | slimeController.ts | TC-SCTRL-002 | Unit | Security | Covered | `getSlimeStats` returns `403` on authenticated/route user mismatch. |
| FR-03 | slimeController.ts | TC-SCTRL-003 | Unit | Happy Path | Covered | `getSlimeStats` returns profile payload using authenticated user id. |
| FR-03 | slimeController.ts | TC-SCTRL-004 | Unit | Boundary | Covered | `getSlimeStats` uses route user id and forwards simulated day-offset resolution flow. |
| FR-03 | slimeController.ts | TC-SCTRL-005 | Unit | Error Path | Covered | `getSlimeStats` maps `SLIME_NOT_FOUND` to `404` with controlled response payload. |
| FR-03 | slimeController.ts | TC-SCTRL-006 | Unit | Error Path | Covered | `getSlimeStats` maps unexpected errors to `500` database-error response payload. |
