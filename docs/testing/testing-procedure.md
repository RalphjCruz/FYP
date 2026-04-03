# Backend Testing Procedure (Essential)

## Coverage Execution
- Run coverage with:
  - `npm --prefix backend test -- --coverage`
- Review coverage report after every checkpoint and identify uncovered lines/branches before proceeding.

## Test Structure
- Unit tests: `backend/tests/unit/*`
- Integration tests: `backend/tests/integration/*`
- Naming: `*.test.ts`

## Mocking Strategy
- Unit tests mock database, JWT, and external dependencies
- Integration tests use real PostgreSQL with transaction rollback

## Coverage Definition
Coverage includes all four metrics:
- lines
- branches
- functions
- statements
All must meet >=90% threshold.

## CI Enforcement
- Tests must pass on every run
- Coverage must meet threshold
- Execution fails if:
  - any test fails
  - coverage < 90%

## Branch Coverage Rule
All decision paths must be tested:
- if/else (true + false)
- switch cases
- try/catch (success + failure)

## Error Handling Validation
Tests must verify:
- correct HTTP status codes (400, 401, 403, 500)
- meaningful error messages
- no sensitive data leakage

## Test Quality Requirement
Each test must include:
- purpose (why it exists)
- requirement mapping (FR ID)
- expected behavior explanation

## Required Threshold
- Required: >=90% (global + per-file)
- Stretch: 95%

## Rules
- Unit tests are default.
- Integration tests only for:
  - DB-state dependent logic
  - transaction validation
  - middleware -> controller -> service verification
- Do not change production logic unless tests show a real defect.

## Checkpoint Output (every time)
- FRs covered
- TCs added
- Coverage by file
- Uncovered lines/branches
- Risks found
- Whether code changes are necessary
