# Traceability Matrix (Template)

| Requirement ID | Function/File     | Test Case ID | Test Type   | Scenario Type | Coverage Status | Notes                          |
| --- | --- | --- | --- | --- | --- | --- |
| FR-02 | inputSanitizer.ts | TC-UTIL-001 | Unit | Invalid Input | Covered | `sanitizeText` removes control chars and trims by default. |
| FR-02 | inputSanitizer.ts | TC-UTIL-002 | Unit | Edge Case | Covered | `sanitizeText` collapses whitespace when option enabled. |
| FR-02 | inputSanitizer.ts | TC-UTIL-003 | Unit | Branch Path | Covered | `sanitizeText` respects `trim=false`. |
| FR-02 | inputSanitizer.ts | TC-UTIL-004 | Unit | Boundary | Covered | `maxLength` applies only for positive integer values. |
| FR-02 | inputSanitizer.ts | TC-UTIL-005 | Unit | Invalid Input | Covered | non-string values sanitize to empty string. |
| FR-02 | inputSanitizer.ts | TC-UTIL-006 | Unit | Happy Path | Covered | `sanitizeEmail` trims/collapses/lowercases correctly. |
| FR-02 | inputSanitizer.ts | TC-UTIL-007 | Unit | Invalid Input | Covered | `sanitizeSlug` accepts valid slug and rejects invalid slug. |
| FR-02 | inputSanitizer.ts | TC-UTIL-008 | Unit | Invalid Input | Covered | `parseInteger` returns fallback value for malformed numeric input. |
| FR-02 | inputSanitizer.ts | TC-UTIL-009 | Unit | Boundary | Covered | `parsePositiveInteger` accepts positive only; rejects zero/negative/invalid. |
| FR-02 | inputSanitizer.ts | TC-UTIL-010 | Unit | Boundary | Covered | `clampNumber` enforces min/max bounds. |
| FR-02 | taskRequestValidators.ts | TC-TRV-001 | Unit | Security | Covered | `getUserIdFromTaskRequest` returns `AUTH_MISMATCH_USER_ID` when authenticated user and route user ids differ. |
| FR-02 | taskRequestValidators.ts | TC-TRV-002 | Unit | Happy Path | Covered | `getUserIdFromTaskRequest` returns authenticated user id when auth context exists and route param is missing. |
| FR-02 | taskRequestValidators.ts | TC-TRV-003 | Unit | Happy Path | Covered | `getUserIdFromTaskRequest` uses positive route user id for unauthenticated requests and `getTaskIdFromTaskRequest` parses positive task id. |
| FR-02 | taskRequestValidators.ts | TC-TRV-004 | Unit | Invalid Input | Covered | `getTaskIdFromTaskRequest` returns null when `taskId` param is invalid. |
| FR-02 | taskRequestValidators.ts | TC-TRV-005 | Unit | Edge Case | Covered | `getUserIdFromTaskRequest` handles empty-array route `userId` by falling back to authenticated user id. |
| FR-02 | taskRequestValidators.ts | TC-TRV-006 | Unit | Invalid Input | Covered | `getUserIdFromTaskRequest` returns null when request is unauthenticated and `userId` route param is missing. |
| FR-02 | taskControllerErrorMapper.ts | TC-TCEM-001 | Unit | Invalid Input | Covered | `handleTaskControllerError` maps `TASK_TITLE_REQUIRED` to `400`. |
| FR-02 | taskControllerErrorMapper.ts | TC-TCEM-002 | Unit | Invalid Input | Covered | `handleTaskControllerError` maps `TASK_TITLE_EMPTY` to `400`. |
| FR-02 | taskControllerErrorMapper.ts | TC-TCEM-003 | Unit | Invalid Input | Covered | `handleTaskControllerError` maps `TASK_NOT_FOUND` to `404`. |
| FR-02 | taskControllerErrorMapper.ts | TC-TCEM-004 | Unit | Duplicate | Covered | `handleTaskControllerError` maps `TASK_ALREADY_COMPLETED` to `409`. |
| FR-02 | taskControllerErrorMapper.ts | TC-TCEM-005 | Unit | Error Path | Covered | `handleTaskControllerError` maps unknown `TaskServiceError` codes to `500`. |
| FR-02 | taskControllerErrorMapper.ts | TC-TCEM-006 | Unit | Error Path | Covered | Non-`TaskServiceError` values are logged and return `500` with `Error.message` or fallback message. |
| FR-02 | taskService.ts | TC-TSVC-001 | Unit | Happy Path | Covered | `getTasksByUserId` maps DB rows to task records and defaults invalid priority to `medium`. |
| FR-02 | taskService.ts | TC-TSVC-002 | Unit | Invalid Input | Covered | `createTaskForUser` throws `TASK_TITLE_REQUIRED` when sanitized title is empty. |
| FR-02 | taskService.ts | TC-TSVC-003 | Unit | Happy Path | Covered | `createTaskForUser` inserts normalized task values and maps returned row. |
| FR-02 | taskService.ts | TC-TSVC-004 | Unit | Invalid Input | Covered | `updateTaskForUser` throws `TASK_TITLE_EMPTY` when provided title sanitizes to empty. |
| FR-02 | taskService.ts | TC-TSVC-005 | Unit | Invalid Input | Covered | `updateTaskForUser` throws `TASK_NOT_FOUND` when update returns no rows. |
| FR-02 | taskService.ts | TC-TSVC-006 | Unit | Invalid Input | Covered | `deleteTaskForUser` throws `TASK_NOT_FOUND` when delete returns no rows. |
| FR-02 | taskService.ts | TC-TSVC-007 | Unit | Happy Path | Covered | `updateTaskForUser` returns mapped updated task row with normalized input values. |
| FR-02 | taskService.ts | TC-TSVC-008 | Unit | Invalid Input | Covered | `completeTaskForUser` throws `TASK_NOT_FOUND` and rolls back transaction when task is missing. |
| FR-02 | taskService.ts | TC-TSVC-009 | Unit | Invalid Input | Covered | `completeTaskForUser` throws `TASK_ALREADY_COMPLETED` and rolls back when task is already completed. |
| FR-02 | taskService.ts | TC-TSVC-010 | Unit | Happy Path | Covered | `completeTaskForUser` commits and returns XP + unlocked achievement metadata when completion awards XP and achievements. |
| FR-02 | taskService.ts | TC-TSVC-011 | Unit | Edge Case | Covered | `completeTaskForUser` returns `meta: undefined` when XP reward is zero and no achievements unlock. |
| FR-02 | taskService.ts | TC-TSVC-012 | Unit | Boundary | Covered | `resetTasksForUser` returns `deletedCount` from `rowCount` and falls back to `0` for nullish rowCount. |
| FR-02 | taskService.ts | TC-TSVC-013 | Unit | Boundary | Covered | `createTaskForUser` defaults invalid difficulty to `medium` and persists `description` as `null` when sanitized description is empty. |
| FR-02 | taskService.ts | TC-TSVC-014 | Unit | Edge Case | Covered | `updateTaskForUser` keeps nullable update fields (`title/description/difficulty/xpReward`) as `null` when omitted/invalid. |
| FR-02 | taskService.ts | TC-TSVC-015 | Unit | Edge Case | Covered | `completeTaskForUser` treats `null` XP reward as `0`, skips XP service call, and returns no meta when achievements are empty. |
| FR-02 | taskService.ts | TC-TSVC-016 | Unit | Happy Path | Covered | `deleteTaskForUser` completes successfully when delete query returns an id row. |
| FR-02 | taskController.ts | TC-TCTRL-001 | Unit | Security | Covered | `getTasksByUser` returns `403` when authenticated user and route `userId` mismatch. |
| FR-02 | taskController.ts | TC-TCTRL-002 | Unit | Invalid Input | Covered | `getTasksByUser` returns `400` when `userId` cannot be resolved. |
| FR-02 | taskController.ts | TC-TCTRL-003 | Unit | Happy Path | Covered | `getTasksByUser` returns task list payload for resolved user id. |
| FR-02 | taskController.ts | TC-TCTRL-004 | Unit | Security | Covered | `createTask` returns `403` when authenticated user and route `userId` mismatch. |
| FR-02 | taskController.ts | TC-TCTRL-005 | Unit | Happy Path | Covered | `createTask` returns `201` and created-task payload when service succeeds. |
| FR-02 | taskController.ts | TC-TCTRL-006 | Unit | Invalid Input | Covered | `createTask` maps `TaskServiceError` through shared controller error handler response contract. |
| FR-02 | taskController.ts | TC-TCTRL-007 | Unit | Error Path | Covered | `getTasksByUser` returns `500` when task service throws unexpected error. |
| FR-02 | taskController.ts | TC-TCTRL-008 | Unit | Invalid Input | Covered | `createTask` returns `400` when `userId` cannot be resolved. |
| FR-02 | taskController.ts | TC-TCTRL-009 | Unit | Happy Path | Covered | `updateTask` returns updated-task payload when service succeeds. |
| FR-02 | taskController.ts | TC-TCTRL-010 | Unit | Happy Path | Covered | `completeTask` returns completed-task payload with `meta` when service succeeds. |
| FR-02 | taskController.ts | TC-TCTRL-011 | Unit | Happy Path | Covered | `deleteTask` returns success message when service delete succeeds. |
| FR-02 | taskController.ts | TC-TCTRL-012 | Unit | Security | Covered | `resetTasksDev` returns `401` and exits early when authenticated user is missing. |
| FR-02 | taskController.ts | TC-TCTRL-013 | Unit | Security | Covered | `updateTask` returns `403` when authenticated user and route `userId` mismatch. |
| FR-02 | taskController.ts | TC-TCTRL-014 | Unit | Invalid Input | Covered | `updateTask` returns `400` when `taskId` is invalid. |
| FR-02 | taskController.ts | TC-TCTRL-015 | Unit | Error Path | Covered | `updateTask` returns `500` when update service throws unexpected error. |
| FR-02 | taskController.ts | TC-TCTRL-016 | Unit | Security | Covered | `completeTask` returns `403` when authenticated user and route `userId` mismatch. |
| FR-02 | taskController.ts | TC-TCTRL-017 | Unit | Invalid Input | Covered | `completeTask` returns `400` when `taskId` is invalid. |
| FR-02 | taskController.ts | TC-TCTRL-018 | Unit | Error Path | Covered | `completeTask` returns `500` when completion service throws unexpected error. |
| FR-02 | taskController.ts | TC-TCTRL-019 | Unit | Security | Covered | `deleteTask` returns `403` when authenticated user and route `userId` mismatch. |
| FR-02 | taskController.ts | TC-TCTRL-020 | Unit | Invalid Input | Covered | `deleteTask` returns `400` when `taskId` is invalid. |
| FR-02 | taskController.ts | TC-TCTRL-021 | Unit | Error Path | Covered | `deleteTask` returns `500` when delete service throws unexpected error. |
| FR-02 | taskController.ts | TC-TCTRL-022 | Unit | Happy Path | Covered | `resetTasksDev` returns reset payload when authenticated user reset succeeds. |
| FR-02 | taskController.ts | TC-TCTRL-023 | Unit | Error Path | Covered | `resetTasksDev` returns `500` when reset service throws unexpected error. |

