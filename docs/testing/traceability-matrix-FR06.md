# Traceability Matrix (FR-06)

| Requirement ID | Function/File | Test Case ID | Test Type | Scenario Type | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| FR-06 | customizationRequestValidators.ts | TC-CRV-001 | Unit | Happy Path | Covered | `parseCustomizationDevCoinAmount` parses valid integer string values. |
| FR-06 | customizationRequestValidators.ts | TC-CRV-002 | Unit | Invalid Input | Covered | `parseCustomizationDevCoinAmount` falls back to `0` for malformed coin input. |
| FR-06 | customizationRequestValidators.ts | TC-CRV-003 | Unit | Boundary | Covered | `parseCustomizationDevCoinAmount` follows integer parsing behavior for decimal/prefixed values. |
| FR-06 | customizationRequestValidators.ts | TC-CRV-004 | Unit | Happy Path | Covered | `parseCustomizationItemId` returns sanitized slug when input is valid. |
| FR-06 | customizationRequestValidators.ts | TC-CRV-005 | Unit | Invalid Input | Covered | `parseCustomizationItemId` returns `null` when slug content is invalid or empty. |
| FR-06 | customizationRequestValidators.ts | TC-CRV-006 | Unit | Boundary | Covered | `parseCustomizationItemId` enforces slug lowercasing and max-length sanitizer behavior. |
| FR-06 | customizationErrorMapper.ts | TC-CEM-001 | Unit | Error Path | Covered | `getCustomizationErrorMessage` returns `Error.message` for `Error` instances. |
| FR-06 | customizationErrorMapper.ts | TC-CEM-002 | Unit | Error Path | Covered | `getCustomizationErrorMessage` returns fallback text for non-`Error` values. |
| FR-06 | customizationErrorMapper.ts | TC-CEM-003 | Unit | Duplicate | Covered | `mapClaimDailyCoinsErrorStatus` maps already-claimed message to `409`. |
| FR-06 | customizationErrorMapper.ts | TC-CEM-004 | Unit | Invalid Input | Covered | `mapClaimDailyCoinsErrorStatus` maps other claim failures to `400`. |
| FR-06 | customizationErrorMapper.ts | TC-CEM-005 | Unit | Boundary | Covered | `mapUnlockCustomizationErrorStatus` maps insufficient-coin error to `400` and fallback to `404`. |
| FR-06 | customizationErrorMapper.ts | TC-CEM-006 | Unit | Boundary | Covered | `mapEquipCustomizationErrorStatus` maps unlock-required error to `400` and fallback to `404`. |
| FR-06 | customizationService.ts | TC-CSV-001 | Unit | Happy Path | Covered | `getCustomizationOverview` returns wallet/catalog state, starter ownership, and default aura/color auto-equip behavior. |
| FR-06 | customizationService.ts | TC-CSV-002 | Unit | Happy Path | Covered | `claimDailyCoins` increments wallet balance and returns reward payload when claim is available. |
| FR-06 | customizationService.ts | TC-CSV-003 | Unit | Duplicate | Covered | `claimDailyCoins` rejects repeated same-day claims when update affects zero rows. |
| FR-06 | customizationService.ts | TC-CSV-004 | Unit | Invalid Input | Covered | `addCoinsDev` rejects non-positive/non-integer amounts before persistence writes. |
| FR-06 | customizationService.ts | TC-CSV-005 | Unit | Boundary | Covered | `resetCoinsDev` falls back to default coin value when update returns empty coin payload. |
| FR-06 | customizationService.ts | TC-CSV-006 | Unit | Reliability | Covered | `unlockCustomizationItem` rolls back and throws when non-starter item price exceeds wallet balance. |
