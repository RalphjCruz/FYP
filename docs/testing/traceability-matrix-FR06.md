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
| FR-06 | customizationService.ts | TC-CSV-007 | Unit | Happy Path | Covered | `addCoinsDev` updates wallet balance and returns `{ coins, added }` for valid positive integer input. |
| FR-06 | customizationService.ts | TC-CSV-008 | Unit | State Transition | Covered | `resetCustomizationProgressDev` removes non-starter state and re-equips starter aura/color defaults. |
| FR-06 | customizationService.ts | TC-CSV-009 | Unit | Invalid Input | Covered | `unlockCustomizationItem` rejects unknown catalog ids. |
| FR-06 | customizationService.ts | TC-CSV-010 | Unit | Happy Path | Covered | Starter item unlock path returns `alreadyOwned: true` and keeps wallet coin state from overview. |
| FR-06 | customizationService.ts | TC-CSV-011 | Unit | Idempotency | Covered | Unlocking an already-owned non-starter item commits without coin deduction and returns `alreadyOwned: true`. |
| FR-06 | customizationService.ts | TC-CSV-012 | Unit | Happy Path | Covered | Successful non-starter unlock deducts wallet coins, inserts inventory, and commits transaction. |
| FR-06 | customizationService.ts | TC-CSV-013 | Unit | Invalid Input | Covered | `equipCustomizationItem` rejects unknown catalog item ids. |
| FR-06 | customizationService.ts | TC-CSV-014 | Unit | Happy Path | Covered | Starter item equip bypasses inventory ownership check and upserts loadout state. |
| FR-06 | customizationService.ts | TC-CSV-015 | Unit | Security | Covered | Non-starter equip is blocked when inventory ownership is missing. |
| FR-06 | customizationService.ts | TC-CSV-016 | Unit | Happy Path | Covered | Owned non-starter item equip succeeds and writes slot loadout. |
| FR-06 | customizationService.ts | TC-CSV-017 | Unit | Error Path | Covered | Equip flow propagates persistence errors from loadout upsert write. |
| FR-06 | customizationService.ts | TC-CSV-018 | Unit | Branch Path | Covered | Overview keeps explicit aura/color loadout values and ignores unsupported slot keys. |
| FR-06 | customizationService.ts | TC-CSV-019 | Unit | Boundary | Covered | Overview falls back wallet coins to default when wallet query row is missing. |
| FR-06 | customizationService.ts | TC-CSV-020 | Unit | Boundary | Covered | Reset progress uses nullish rowCount fallbacks and returns zero deletion counts. |
| FR-06 | customizationService.ts | TC-CSV-021 | Unit | Boundary | Covered | Owned-item unlock path falls back wallet coins to `0` when wallet lookup has no rows. |
| FR-06 | customizationService.ts | TC-CSV-022 | Unit | Boundary | Covered | Unlock path uses missing-wallet fallback (`0`) for locked coin check and rejects purchase. |
| FR-06 | customizationController.ts | TC-CCTRL-001 | Unit | Security | Covered | Overview controller returns `401` and exits early when authenticated user is missing. |
| FR-06 | customizationController.ts | TC-CCTRL-002 | Unit | Happy Path | Covered | Overview controller returns `{ success: true, data }` for authenticated requests. |
| FR-06 | customizationController.ts | TC-CCTRL-003 | Unit | Duplicate | Covered | Daily claim controller maps already-claimed service error to `409` response. |
| FR-06 | customizationController.ts | TC-CCTRL-004 | Unit | Happy Path | Covered | Dev add-coins controller parses amount and returns success payload/message. |
| FR-06 | customizationController.ts | TC-CCTRL-005 | Unit | Invalid Input | Covered | Unlock controller rejects missing/invalid `itemId` with `400`. |
| FR-06 | customizationController.ts | TC-CCTRL-006 | Unit | State Transition | Covered | Unlock controller returns unlocked payload and achievement meta for non-owned item unlock. |
| FR-06 | customizationController.ts | TC-CCTRL-007 | Unit | Error Path | Covered | Overview controller maps unexpected service errors to `500` with safe message. |
| FR-06 | customizationController.ts | TC-CCTRL-008 | Unit | Error Path | Covered | Claim-daily controller maps non-duplicate failures to `400` with fallback error text. |
| FR-06 | customizationController.ts | TC-CCTRL-009 | Unit | Error Path | Covered | Dev add-coins controller maps non-`Error` failures to `400` fallback response. |
| FR-06 | customizationController.ts | TC-CCTRL-010 | Unit | State Transition | Covered | Reset-progress dev controller returns success payload and maps fallback error path to `400`. |
| FR-06 | customizationController.ts | TC-CCTRL-011 | Unit | State Transition | Covered | Reset-coins dev controller returns success payload and maps `Error` failures to `400`. |
| FR-06 | customizationController.ts | TC-CCTRL-012 | Unit | Invalid Input | Covered | Unlock controller maps unknown-item service errors to `404`. |
| FR-06 | customizationController.ts | TC-CCTRL-013 | Unit | Invalid Input | Covered | Equip controller rejects missing/invalid `itemId` with `400`. |
| FR-06 | customizationController.ts | TC-CCTRL-014 | Unit | Security | Covered | Equip controller returns success payload and maps unlock-required error to `400`. |
| FR-06 | customizationController.ts | TC-CCTRL-015 | Unit | Happy Path | Covered | Claim-daily controller returns success payload `{ success, message, data }` on successful reward claim. |
| FR-06 | customizationController.ts | TC-CCTRL-016 | Unit | Security | Covered | Claim-daily controller returns `401` and exits early when auth context is missing. |
| FR-06 | customizationController.ts | TC-CCTRL-017 | Unit | Security | Covered | Dev add-coins controller returns `401` and exits early when auth context is missing. |
| FR-06 | customizationController.ts | TC-CCTRL-018 | Unit | Error Path | Covered | Dev add-coins controller returns `400` with `Error.message` when service throws an `Error`. |
| FR-06 | customizationController.ts | TC-CCTRL-019 | Unit | Security | Covered | Unlock controller returns `401` and exits early when auth context is missing. |
| FR-06 | customizationController.ts | TC-CCTRL-020 | Unit | Idempotency | Covered | Unlock controller skips achievement evaluation and returns `meta: undefined` for already-owned items. |
| FR-06 | customizationController.ts | TC-CCTRL-021 | Unit | Security | Covered | Equip controller returns `401` and exits early when auth context is missing. |
| FR-06 | customizationController.ts | TC-CCTRL-022 | Unit | Invalid Input | Covered | Equip controller maps unknown-item service failures to `404`. |
| FR-06 | customizationController.ts | TC-CCTRL-023 | Unit | Error Path | Covered | Overview controller uses fallback `500` message when non-`Error` values are thrown. |
| FR-06 | customizationController.ts | TC-CCTRL-024 | Unit | Security | Covered | Reset-progress dev controller returns `401` and exits early when auth context is missing. |
| FR-06 | customizationController.ts | TC-CCTRL-025 | Unit | Error Path | Covered | Reset-progress dev controller returns `400` with `Error.message` on `Error` failures. |
| FR-06 | customizationController.ts | TC-CCTRL-026 | Unit | Security | Covered | Reset-coins dev controller returns `401` and exits early when auth context is missing. |
| FR-06 | customizationController.ts | TC-CCTRL-027 | Unit | Error Path | Covered | Reset-coins dev controller maps non-`Error` failures to fallback `400` message. |
