# Traceability Matrix (FR-05)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-05 | focusRequestValidators.ts | TC-FRV-001 | Unit | Invalid Input | Covered | `parseOptionalUtcDate` returns `null` for non-string values. |
| FR-05 | focusRequestValidators.ts | TC-FRV-002 | Unit | Invalid Input | Covered | `parseOptionalUtcDate` returns `null` for blank/invalid date strings. |
| FR-05 | focusRequestValidators.ts | TC-FRV-003 | Unit | Happy Path | Covered | `parseOptionalUtcDate` returns parsed `Date` for valid ISO UTC string input. |
| FR-05 | focusRequestValidators.ts | TC-FRV-004 | Unit | Edge Case | Covered | `parseOptionalTimezone` returns sanitized value or `undefined` when empty/missing. |
| FR-05 | focusRequestValidators.ts | TC-FRV-005 | Unit | Boundary | Covered | `parseOptionalStudyStyle` allows only supported style enum values. |
| FR-05 | focusRequestValidators.ts | TC-FRV-006 | Unit | Boundary | Covered | `parseOptionalDistractionLevel` allows only supported distraction-level enum values. |
| FR-05 | studyHealthService.ts | TC-SHS-001 | Unit | Invalid Input | Covered | `normalizeTimezoneIana` falls back to `UTC` for invalid input and preserves valid IANA timezones. |
| FR-05 | studyHealthService.ts | TC-SHS-002 | Unit | Boundary | Covered | `getMaxHpByLevel` scales HP from level baseline using fixed per-level increment. |
| FR-05 | studyHealthService.ts | TC-SHS-003 | Unit | Branch Path | Covered | `calculateDailyHpDelta` applies no-study loss, under-goal loss, and over-goal recovery branches. |
| FR-05 | studyHealthService.ts | TC-SHS-004 | Unit | State Transition | Covered | `applyDailyHpSettlement` reduces level on HP depletion unless daily penalty already applied. |
| FR-05 | studyHealthService.ts | TC-SHS-005 | Unit | Reliability | Covered | `getStudyHealthSnapshot` commits transaction and returns normalized snapshot on success path. |
| FR-05 | studyHealthService.ts | TC-SHS-006 | Unit | Error Path | Covered | `getStudyHealthSnapshot` rolls back and rethrows when slime lock/select fails. |
| FR-05 | studyHealthService.ts | TC-SHS-007 | Unit | Boundary | Covered | `updateStudyProfile` normalizes invalid inputs and persists clamped daily-goal update. |
| FR-05 | studyHealthService.ts | TC-SHS-008 | Unit | Error Path | Covered | `updateStudyProfile` rolls back transaction when daily aggregate upsert fails. |
| FR-05 | studyHealthService.ts | TC-SHS-009 | Unit | State Transition | Covered | `recordFocusSessionCompletion` commits session, awards XP, updates streak, and returns updated snapshot. |
| FR-05 | studyHealthService.ts | TC-SHS-010 | Unit | Error Path | Covered | `recordFocusSessionCompletion` rolls back when focus-session insert fails. |
| FR-05 | studyHealthService.ts | TC-SHS-011 | Unit | Reliability | Covered | `resetStudyProgressDev` clears session aggregates and restores baseline study-health state. |
| FR-05 | studyHealthService.ts | TC-SHS-012 | Unit | Error Path | Covered | `resetStudyProgressDev` rolls back when session-delete operation fails. |
| FR-05 | studyHealthService.ts | TC-SHS-013 | Unit | Reliability | Covered | `getStudyHealthSnapshot` succeeds even when legacy schema backfill update query fails inside schema ensure catch path. |
| FR-05 | studyHealthService.ts | TC-SHS-014 | Unit | Edge Case | Covered | `updateStudyProfile` uses fallback `nowUtc` and normalizes Date-typed study-stat day fields. |
| FR-05 | studyHealthService.ts | TC-SHS-015 | Unit | Error Path | Covered | `getStudyHealthSnapshot` rolls back when study stats row remains missing after initialization insert. |
| FR-05 | studyHealthService.ts | TC-SHS-016 | Unit | State Transition | Covered | Settlement loop processes focused and non-focused days to update streak/HP across unprocessed range. |
| FR-05 | studyHealthService.ts | TC-SHS-017 | Unit | State Transition | Covered | Settlement loop follows level-reduction branch and syncs slime level from penalized XP floor. |
| FR-05 | studyHealthService.ts | TC-SHS-018 | Unit | Branch Path | Covered | `recordFocusSessionCompletion` executes streak else-if branch when last studied day is neither yesterday nor current day. |
| FR-05 | studyHealthService.ts | TC-SHS-019 | Unit | Boundary | Covered | `applyDailyHpSettlement` falls back from non-finite carry and applies positive delta floor branch. |
| FR-05 | studyHealthService.ts | TC-SHS-020 | Unit | Reliability | Covered | `ensureStudyHealthSchema` default-db path executes and tolerates legacy backfill query failure. |
| FR-05 | studyHealthService.ts | TC-SHS-021 | Unit | Edge Case | Covered | `getStudyHealthSnapshot` handles nullish slime/stats/today fields via default fallback normalization. |
| FR-05 | studyHealthService.ts | TC-SHS-022 | Unit | Branch Path | Covered | Settlement loop sets streak to `1` for focused non-consecutive study day branch. |
| FR-05 | studyHealthService.ts | TC-SHS-023 | Unit | Branch Path | Covered | Settlement loop keeps streak unchanged when focused day equals already-recorded last-studied day. |
| FR-05 | studyHealthService.ts | TC-SHS-024 | Unit | Reliability | Covered | `resetStudyProgressDev` covers default-input path and commits reset baseline flow. |
| FR-05 | focusController.ts | TC-FCTRL-001 | Unit | Security | Covered | `completeFocusSessionController` exits early when authenticated user is missing. |
| FR-05 | focusController.ts | TC-FCTRL-002 | Unit | Invalid Input | Covered | `completeFocusSessionController` rejects non-positive `durationMinutes` with `400`. |
| FR-05 | focusController.ts | TC-FCTRL-003 | Unit | Invalid Input | Covered | `completeFocusSessionController` rejects invalid `completedAtUtc` payload with `400`. |
| FR-05 | focusController.ts | TC-FCTRL-004 | Unit | Happy Path | Covered | `completeFocusSessionController` clamps duration and records focus session successfully. |
| FR-05 | focusController.ts | TC-FCTRL-005 | Unit | Invalid Input | Covered | `updateFocusProfileController` rejects non-integer `targetDailyMinutes` with `400`. |
| FR-05 | focusController.ts | TC-FCTRL-006 | Unit | Boundary | Covered | `settleFocusDayDevController` clamps day offset and returns simulated settlement payload. |
| FR-05 | focusController.ts | TC-FCTRL-007 | Unit | Error Path | Covered | `completeFocusSessionController` maps thrown `Error` to `400` with service-provided message. |
| FR-05 | focusController.ts | TC-FCTRL-008 | Unit | Invalid Input | Covered | `updateFocusProfileController` rejects invalid `studyStyle` enum values with `400`. |
| FR-05 | focusController.ts | TC-FCTRL-009 | Unit | Invalid Input | Covered | `updateFocusProfileController` rejects non-integer `preferredSessionIntensity` with `400`. |
| FR-05 | focusController.ts | TC-FCTRL-010 | Unit | Invalid Input | Covered | `updateFocusProfileController` rejects invalid `distractionLevel` enum values with `400`. |
| FR-05 | focusController.ts | TC-FCTRL-011 | Unit | State Transition | Covered | `updateFocusProfileController` clamps profile values on success and maps non-`Error` failures to fallback message. |
| FR-05 | focusController.ts | TC-FCTRL-012 | Unit | Reliability | Covered | Dev settlement/reset controllers cover integer-validation, catch fallback, reset success payload, and reset failure fallback. |
| FR-05 | focusController.ts | TC-FCTRL-013 | Unit | Error Path | Covered | `completeFocusSessionController` maps non-`Error` failures to fallback `400` message. |
| FR-05 | focusController.ts | TC-FCTRL-014 | Unit | Security | Covered | `updateFocusProfileController` exits early when authenticated user is missing. |
| FR-05 | focusController.ts | TC-FCTRL-015 | Unit | Error Path | Covered | `updateFocusProfileController` maps thrown `Error` to message-preserving `400` response. |
| FR-05 | focusController.ts | TC-FCTRL-016 | Unit | Error Path | Covered | `settleFocusDayDevController` maps non-`Error` failures to fallback `400` message. |
| FR-05 | focusController.ts | TC-FCTRL-017 | Unit | Security | Covered | `resetFocusProgressDevController` exits early when authenticated user is missing. |
| FR-05 | focusController.ts | TC-FCTRL-018 | Unit | Error Path | Covered | `resetFocusProgressDevController` maps thrown `Error` to message-preserving `400` response. |
| FR-05 | focusController.ts | TC-FCTRL-019 | Unit | Branch Path | Covered | `updateFocusProfileController` forwards `targetDailyMinutes: undefined` when the field is omitted and still succeeds for valid optional profile fields. |
| FR-05 | focusController.ts | TC-FCTRL-020 | Unit | Security | Covered | `settleFocusDayDevController` exits early when authenticated user is missing and avoids any service calls. |
