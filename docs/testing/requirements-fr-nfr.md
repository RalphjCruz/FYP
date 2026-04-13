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

* **FR-10: Account Data Export (Privacy)**

  * System must allow authenticated active users to export only their own account data.
  * Export must be structured JSON grouped by domain entities.
  * Export endpoint must enforce cooldown/rate limit and return `429` with `Retry-After` when exceeded.

* **FR-11: Account Deletion Lifecycle (Privacy)**

  * System must provide authenticated deletion request, status, and cancellation endpoints.
  * Deletion request and cancellation actions must be idempotent.
  * Deletion status must be queryable without exposing other users' data.
  * Deletion request and cancellation actions must be audit logged.

* **FR-12: Account Purge & Retention Jobs (Privacy)**

  * System must purge due deletion requests using retry-safe, idempotent job behavior.
  * Purge flow must cleanup non-cascade artifacts explicitly before user deletion.
  * Purge execution and failure events must be recorded in operational/system logs outside user-owned deleted data.
  * Partial failures must not corrupt state and must remain safe to retry.

* **FR-13: Rate-Limit Key Normalization & Response Contract**

  * Protected-route rate-limit keys must use `hash(ip + ":" + user_id + ":" + route_id)`.
  * Login rate-limit keys must use `hash(ip + ":" + normalized_email + ":" + route_id)`.
  * Normalized email must be trimmed and lowercased before key generation.
  * Rate-limited responses must return `429` with `Retry-After`.

* **FR-14: Focus Draft Lifecycle & Anti-Cheat**

  * System must enforce one active focus draft per user; new draft start must mark prior active draft as `invalidated`.
  * Focus completion must reference an authenticated user's active draft and reject replay/non-active draft completion.
  * Focus completion duration must be computed server-side from draft start time and enforce minimum duration threshold.

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
