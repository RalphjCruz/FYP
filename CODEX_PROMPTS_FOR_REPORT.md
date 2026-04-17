# Reverse-Engineered Codex Prompts (From `PROJECT_NOTES` Section 5.2+)

This list reconstructs likely prompts that drove the codebase from:
- `### 5.2 Auth and Security Foundation`
- through `### 5.12 Achievements / Analytics / Leaderboard history in context`

The prompts are written in natural, human wording, but mapped directly to the implementation notes.

## 5.2 Auth and Security Foundation

1. Implement JWT authentication with `register`, `login`, and `me` endpoints.
2. Add secure password hashing with bcrypt across registration and login flows.
3. Introduce auth middleware for protected routes and enforce token validation.
4. Add login abuse protection with failed-attempt tracking per account.
5. Implement temporary lockout after repeated failed login attempts.
6. Record auth security audit events for suspicious/failed login activity.
7. Harden CORS so allowed origins are controlled by environment configuration.
8. Disable test-user or dev-only auth routes in production.
9. Add security-focused tests for authorization guards, CORS behavior, and dev-route gating.

## 5.3 Frontend Modularization Wave

10. Refactor the app shell into feature-oriented components (`QuickStats`, `ConnectionAlert`, `ActivityFeed`, `SlimeCompanionCard`).
11. Move slime data fetching/state management into a dedicated hook (`useSlimeData`).
12. Introduce a feature API layer (`slimeApi`) instead of calling fetch logic directly in page components.
13. Add barrel exports to reduce deep imports and improve module boundaries.
14. Improve sidebar collapse behavior and iterate on responsive layout handling.
15. Remove old `SystemStatus` UI once the new modular structure is stable.

## 5.4 Focus Feature Evolution

16. Implement a wheel-style focus timer.
17. Add a simple study-personalization survey and connect it to focus settings.
18. Promote focus into a dedicated page, not just a card embedded in dashboard.
19. Enforce session locking behavior while a focus session is active.
20. Handle tab/window leave attempts during focus sessions.
21. Remove pause behavior for stricter session flow where required.
22. Fix recurring start/reset reliability bugs in the focus workflow.
23. Replace browser alert/confirm patterns with in-app warning UX.
24. Prototype a popup-style focus mode for active sessions.

## 5.5 Focus Guard Experiment (and rollback)

25. Explore a local companion/guard concept to detect distracting desktop apps.
26. Investigate browser constraints around local process inspection and document limitations.
27. Roll back or scale down the guard approach to a browser-safe strategy after feasibility checks.

## 5.6 Tasks Full-stack

28. Integrate the task API with the frontend task views.
29. Implement full task CRUD (create/read/update/delete).
30. Add a complete-task action and status transitions.
31. Add difficulty-based task logic and reward mapping.
32. Connect task completion rewards to server-side XP progression.

## 5.7 Deployment Journey (Railway + Vercel)

33. Deploy backend service to Railway.
34. Provision and connect PostgreSQL on Railway.
35. Deploy frontend to Vercel and confirm environment wiring.
36. Use `/health` as a deployment sanity check endpoint.
37. Wire backend CORS to exact frontend deployment domains.
38. Troubleshoot Docker daemon and missing pipe startup errors during local deploy prep.
39. Fix path mistakes and script typos (e.g., `frontent` vs `frontend`) in workflow docs/commands.
40. Resolve DB host mismatch issues (`ENOTFOUND db`) between Docker and non-Docker contexts.
41. Handle duplicate test-user collisions safely in deployment/testing flows.
42. Document `psql` installation/connect workflow for Windows PowerShell.
43. Verify Railway Postgres directly via `psql` when dashboard/UI access is unreliable.

## 5.8 Dev Workflow Hardening

44. Formalize `.env.example` patterns across services.
45. Add commit-hook safeguards to reduce accidental secret commits.
46. Write onboarding steps for setting up the project on a second laptop.
47. Enforce small commits with verification before each push.

## 5.9 Customization + Wallet

48. Implement backend customization wallet logic.
49. Add a customization catalog model and API surface.
50. Add user inventory ownership tracking for unlocked items.
51. Add loadout/equipped-item support.
52. Add a daily claim mechanic for customization currency.
53. Make dashboard slime visuals reflect currently equipped customization.
54. Add PNG-based color skin assets and wire them into rendering.

## 5.10 Visual/Styling Iteration Loop

55. Make slime rendering consistent across dashboard, focus, and customize screens.
56. Overlay face features (eyes/mouth) correctly on top of slime skins.
57. Run iterative scale/offset calibration to handle transparent-padding asset issues.
58. Refactor slime visuals into shared face geometry plus per-view calibration values.
59. Split CSS architecture into `tokens/base/layout` and feature-level styles.

## 5.11 Progression Features

60. Implement non-linear XP leveling so level progression gets harder over time.
61. Add a dev-only XP-add path for fast local testing.
62. Make task completion award XP transactionally and prevent duplicate rewards.
63. Enrich slime API payloads with total XP plus per-level progress metrics.

## 5.12 Achievements / Analytics / Leaderboard (history + planning lock)

64. Stabilize XP/level behavior first before adding downstream progression features.
65. Implement achievements after progression rules are stable.
66. Add analytics after achievements are in place.
67. Implement leaderboard after analytics contracts are stable.
68. Keep this area iterative, allowing restructures/reversions while preserving the feature order lock.
