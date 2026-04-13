# Traceability Matrix (FR-12)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-12 | accountRetentionService.ts | TC-B4-PRG-001 | Unit | Reliability | Covered | `purgeDueAccountDeletionRequests` returns no-op summary when no due requests exist. |
| FR-12 | accountRetentionService.ts | TC-B4-PRG-002 | Unit | Cleanup | Covered | `purgeSingleAccountDeletionRequest` explicitly cleans non-cascade artifacts before user deletion. |
| FR-12 | accountRetentionService.ts + operationalAuditLogService.ts | TC-B4-PRG-003 | Unit | Audit Logging | Covered | Purge execution writes operational/system log entry in non-user-owned log table. |
| FR-12 | accountRetentionService.ts + accountDeletionService.ts | TC-B4-PRG-004 | Unit | Failure Handling | Covered | Purge job handles partial failure, records retry metadata, and continues with remaining due requests. |
| FR-12 | accountRetentionService.ts | TC-B4-PRG-005 | Unit | Idempotency | Covered | Purge single-request flow safely returns false for missing rerun and zero-row delete scenarios. |
| FR-12 | accountRetentionService.ts | TC-B4-PRG-006 | Unit | Branch Path | Covered | Purge single-request flow safely skips non-pending and not-yet-due requests. |
