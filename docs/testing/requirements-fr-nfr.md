## Functional Requirements (FR)

* **FR-01: User Authentication**

  * System must allow users to register, login, and retrieve their profile.
  * Invalid credentials must return an error.

* **FR-02: Task Management**

  * System must allow users to create, update, delete, and complete tasks.
  * Completing a task must mark it as completed.

* **FR-03: XP Progression**

  * Completing tasks must award XP based on difficulty.
  * XP must not be awarded more than once per task.

* **FR-04: Achievements**

  * System must evaluate and unlock achievements based on user actions.
  * Achievements must not be unlocked multiple times.

* **FR-05: Focus System**

  * Completing a focus session must update user profile data.
  * Invalid or interrupted sessions must not update progress.

* **FR-06: Customization**

  * Users must be able to unlock and equip items.
  * Wallet balance must update correctly.

* **FR-07: Analytics**

  * System must return aggregated user data (e.g. progress, activity).

* **FR-08: Leaderboard**

  * System must return ranked users based on XP.

* **FR-09: Security / Dev Gating**

  * Dev-only routes must not be accessible in production.

## Non-Functional Requirements (NFR)

* **NFR-01: Security**

  * System must enforce authentication on protected routes.
  * Error responses must not expose sensitive data.

* **NFR-02: Reliability**

  * System must maintain consistent state using transactions.
  * Duplicate operations must not corrupt data.

* **NFR-03: Performance**

  * Queries must be efficient and bounded.
  * API responses should return within acceptable time limits.

* **NFR-04: Maintainability**

  * Code must support traceability between requirements, functions, and tests.
  * Tests must be repeatable and isolated.
