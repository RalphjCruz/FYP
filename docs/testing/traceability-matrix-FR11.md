# Traceability Matrix (FR-11)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-11 | accountDeletionService.ts | TC-B3-DEL-001 | Unit | Happy Path | Covered | `requestAccountDeletion` creates a new pending deletion request when one does not exist. |
| FR-11 | accountDeletionService.ts | TC-B3-DEL-002 | Unit | Idempotency | Covered | `requestAccountDeletion` returns idempotent pending response when deletion is already pending. |
| FR-11 | accountDeletionService.ts | TC-B3-DEL-003 | Unit | Idempotency | Covered | `cancelAccountDeletion` returns idempotent `none` response when no request exists. |
| FR-11 | accountDeletionService.ts | TC-B3-DEL-004 | Unit | State Transition | Covered | `cancelAccountDeletion` moves pending request to `cancelled` status. |
| FR-11 | accountController.ts | TC-B3-DEL-005 | Unit | Security | Covered | `getAccountDeletionStatusController` returns the authenticated user's deletion status payload. |
| FR-11 | accountController.ts + operationalAuditLogService.ts | TC-B3-DEL-006 | Unit | Audit Logging | Covered | Request/cancel deletion controller flows write operational audit events. |
