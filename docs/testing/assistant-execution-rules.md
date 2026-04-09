# Assistant Execution Rules (Persisted)

This file exists so workflow rules survive context compaction.

## Active Rules
- Implement tests in flexible sets sized to current coverage needs.
  - Preferred range: `4` to `8` test cases per set.
  - Use smaller or larger sets only when needed to close specific branch/coverage gaps efficiently.
- After each implemented set, stop and wait for explicit user approval before moving on.
- Do not implement ahead.
- For every implemented set, provide:
  - the FR ID for that set (for example `FR-03`)
  - the test case IDs implemented in that set (for example `TC-SRV-001` to `TC-SRV-006`)
  - the command to run that test file
  - the coverage command
  - the full note block for that set
- Maintain traceability updates for the implemented set only.
- Ensure each traceability row includes the exact `Test Case ID` and keep IDs one-per-row.
