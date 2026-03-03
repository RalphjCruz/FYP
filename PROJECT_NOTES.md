# MySlime Project Notes

Last updated: 2026-03-03 (Europe/Dublin)

This file is the long-form project memory for MySlime. It captures timeline, architecture, implemented features, API contracts, database behavior, dev-only tooling, and next-step context.

## 1. Project Summary

MySlime is a full-stack gamified productivity application where users complete tasks and focus sessions to level up a slime companion. The project is a monorepo with:

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript + PostgreSQL
- Deployment target: Vercel (frontend), Railway (backend + Postgres)
- Architecture style: modular monolith backend + feature-based frontend

Primary product loop:

1. User creates/completes tasks.
2. Task completion grants XP.
3. XP levels up slime using non-linear progression.
4. User unlocks and equips cosmetic customization.
5. Achievements track milestones.
6. Analytics and leaderboard provide feedback/competition.

## 2. Timeline (Start -> Current)

Note: Earlier phases are reconstructed from repository state and previously confirmed working context; recent phases reflect direct implementation iterations.

## Phase 0: Foundation Setup

Initial platform and scaffolding:

- Monorepo created with `backend`, `frontend`, `db`.
- Dockerized local stack with Postgres and pgAdmin.
- Basic API app bootstrapped with route mounting and health route.
- Base DB initialization script (`db/init.sql`) introduced.

Key outcomes:

- Core entities: users, slimes, tasks (plus initial achievements/auth tables in `init.sql`).
- Backend and frontend build pipelines operational.

## Phase 1: Authentication and Security Hardening

Authentication system evolved beyond bare JWT login/register:

- Register/login/me endpoints implemented.
- JWT auth middleware added (`requireAuth`).
- Auto-slime creation on registration.
- Login attack controls added:
  - Failed-attempt window policy
  - Temporary lockouts
  - Auth audit logging
- Auth security schema auto-created at runtime where needed.

Key backend areas:

- `backend/src/controllers/authController.ts`
- `backend/src/services/authSecurityService.ts`
- `backend/src/middlewares/authMiddleware.ts`
- `backend/src/routes/authRoutes.ts`

## Phase 2: Core Dashboard + Tasks + Slime Baseline

Core app shell and baseline feature modules stabilized:

- App shell with sidebar, header, tabbed main content.
- Tasks module backed by API:
  - Create/read/update/delete
  - Complete flow
  - Difficulty-aware XP rewards (`easy/medium/hard`)
- Slime module:
  - Fetch current slime
  - Display slime identity/stats
  - Dashboard blocks (`QuickStats`, `SystemStatus`, etc.)

Key backend:

- `backend/src/controllers/taskController.ts`
- `backend/src/routes/taskRoutes.ts`
- `backend/src/controllers/slimeController.ts`
- `backend/src/routes/slimeroutes.ts`

Key frontend:

- `frontend/src/features/tasks/*`
- `frontend/src/features/slime/*`
- `frontend/src/app/App.tsx`

## Phase 3: Focus Session Feature

Focus mode added as a dedicated product surface:

- Dedicated `Focus Session` tab/page.
- Timer with progress visualization.
- Session lock behavior:
  - Prevents leaving focus page while active
  - Window blur/visibility change handling
  - Session discard on violation/reload
- Personalization inputs via study survey.
- Focus plan logic extracted into utility planner.
- Focus/session state persisted in localStorage.

Key frontend:

- `frontend/src/features/focus/components/FocusTimerCard.tsx`
- `frontend/src/features/focus/hooks/useFocusTimer.ts`
- `frontend/src/features/focus/hooks/useStudySurvey.ts`
- `frontend/src/features/focus/utils/focusPlanner.ts`

## Phase 4: Customization Shop (Backend-Backed)

Customization became full backend-backed progression:

- Cosmetic catalog and slots (`aura`, `hat`, `trail`, `color`).
- Wallet system with coins and daily claim.
- Unlock and equip endpoints.
- Owned inventory persisted server-side.
- Loadout persisted server-side.
- Starter cosmetics auto-available and auto-equipped.

Runtime schema creation pattern introduced for customization tables:

- `customization_wallets`
- `user_customization_inventory`
- `user_customization_loadout`

Key backend:

- `backend/src/services/customizationService.ts`
- `backend/src/controllers/customizationController.ts`
- `backend/src/routes/customizationRoutes.ts`

Key frontend:

- `frontend/src/features/customization/*`

## Phase 5: Slime Visual Iteration and Calibration

Visual quality and calibration work landed:

- Slime color skins switched to PNG assets.
- Face overlays (eyes/mouth) stabilized over image skins.
- Shared face scaling model introduced (scales with slime size).
- Per-view calibration via CSS variables.
- Focus-view alignment tuned with view-specific X/Y multipliers.

Key frontend:

- `frontend/src/features/customization/utils/colorSkinAssets.ts`
- `frontend/src/features/slime/components/SlimeCompanionCard.tsx`
- `frontend/src/features/focus/styles.css`
- `frontend/src/app/App.css` and style token/layout files

## Phase 6: XP + Leveling System (Non-Linear)

XP and level progression became robust and server-authoritative:

- Non-linear XP curve implemented.
- Level/evolution derived from total XP.
- Task completion awards XP server-side transactionally.
- XP event logging table introduced (`slime_xp_events`).
- Slime API returns richer progression fields:
  - `totalExperience`
  - `experienceForNextLevel`
  - `experienceToNextLevel`
  - `levelProgressPercent`
- Frontend selectors updated to consume backend progression values.

Dev support added:

- `POST /api/slime/me/dev-xp` (non-production)
- Dashboard dev XP button shown only on localhost.

Key backend:

- `backend/src/services/xpService.ts`
- `backend/src/controllers/taskController.ts`
- `backend/src/controllers/slimeController.ts`

Key frontend:

- `frontend/src/features/slime/api/slimeApi.ts`
- `frontend/src/features/slime/utils/slimeSelectors.ts`
- `frontend/src/app/App.tsx`

## Phase 7: Achievements MVP (Initial)

Achievements system introduced as backend-evaluated and persisted:

- Triggered on meaningful events (task completion, unlock, slime stat refresh).
- Persisted in `user_achievements`.
- Achievement definitions seeded/upserted by service.
- Frontend initially rendered achievements list in dashboard.

Initial set included:

- `first_task`
- `task_10`
- `level_3`
- `level_5`
- `xp_500`
- `first_unlock`

## Phase 8: Dev Reset Tools for XP/Achievements

Developer quality-of-life additions:

- Dev-only slime XP reset endpoint.
- Dev-only achievement reset endpoint.
- Dev-only buttons on dashboard (localhost only).
- Production-mode tests confirm dev routes return `404`.

Endpoints:

- `POST /api/slime/me/dev-reset-xp`
- `POST /api/slime/me/dev-reset-achievements`

Production test coverage:

- `backend/src/__tests__/slimeRoutes.production.test.ts`

## Phase 9: Achievements Tab + Expansion to 8

Achievements moved out of dashboard into dedicated tab:

- New `Achievements` tab in main navigation.
- Dashboard no longer carries achievements panel.
- UI shows locked/unlocked state.

Achievement set expanded to eight:

- `first_task`
- `task_10`
- `task_25`
- `level_3`
- `level_5`
- `xp_500`
- `xp_1000`
- `first_unlock`

Backend now returns:

- `achievements` (unlocked subset)
- `achievementProgress` (full 8-item state)

## Phase 10: Analytics Feature (Simple MVP)

Analytics module added with backend summary endpoint + frontend tab:

Endpoint:

- `GET /api/analytics/me/summary`

Returned metrics:

- Tasks total/completed/completion rate
- Tasks completed trend over last 7 days
- XP total/level
- XP gained trend over last 7 days
- Unlocked achievements count

Frontend:

- `Analytics` tab with KPI cards and two 7-day trend charts.

## Phase 11: Customization in Main Nav + Reset Earned Cosmetics + Leaderboard MVP

Navigation cleanup:

- `Customize` moved from bottom secondary sidebar section into main tab list.

Customization dev reset:

- New non-production endpoint resets earned cosmetics/loadout to starter state.
- Frontend button in customization workspace (localhost only): `Reset Earned Cosmetics`.

Endpoint:

- `POST /api/customization/dev-reset-progress`

Leaderboard MVP:

- New leaderboard backend route:
  - `GET /api/leaderboard/global`
- Global ranking sort:
  - Level desc
  - XP desc
  - Completed tasks desc
  - Username asc
- Frontend `Leaderboard` tab:
  - Global leaderboard active
  - Local and Group modes shown disabled/greyed (`Soon`)

## 3. Current Feature Inventory (As Of Now)

## Completed and Active

- Auth with lockout/audit hardening.
- Slime progression with non-linear XP.
- Tasks with backend persistence and XP rewards.
- Focus session module with anti-distraction behavior.
- Customization shop with wallet/inventory/loadout.
- Achievements (8) with backend evaluation + persistence + progress UI.
- Analytics tab with backend-driven summary/trends.
- Leaderboard tab with global leaderboard.

## In Progress / Placeholder

- Leaderboard local/group modes (UI placeholder only).
- Some dashboard quick stats are static placeholders (`0` values).
- Activity feed currently placeholder-style.

## 4. Backend API Contract (Current)

Root:

- `GET /health`
- `GET /`

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Slime:

- `GET /api/slime/health`
- `POST /api/slime/test-user` (dev only)
- `GET /api/slime/me`
- `GET /api/slime/:userId` (auth + user-match checks)
- `POST /api/slime/me/dev-xp` (dev only)
- `POST /api/slime/me/dev-reset-xp` (dev only)
- `POST /api/slime/me/dev-reset-achievements` (dev only)

Tasks:

- `GET /api/tasks`
- `POST /api/tasks`
- `POST /api/tasks/:taskId/complete`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- Backward-compatible user-id variants still present.

Customization:

- `GET /api/customization/overview`
- `POST /api/customization/wallet/claim-daily`
- `POST /api/customization/items/unlock`
- `POST /api/customization/items/equip`
- `POST /api/customization/wallet/dev-add` (dev only)
- `POST /api/customization/dev-reset-progress` (dev only)

Analytics:

- `GET /api/analytics/me/summary`

Leaderboard:

- `GET /api/leaderboard/global?limit=20`

## 5. Database Model Notes

## Base `init.sql` tables

- `users`
- `slimes`
- `tasks`
- `achievements` (legacy shape in init file)
- `user_achievements`
- `auth_login_guards`
- `auth_audit_logs`

## Runtime-created/normalized tables and columns

- `customization_wallets` (service-managed)
- `user_customization_inventory` (service-managed)
- `user_customization_loadout` (service-managed)
- `slime_xp_events` (service-managed)
- `achievements.achievement_key` + normalized fields/indices ensured by `achievementService`

Important detail:

- Runtime service logic currently normalizes achievements schema even if `db/init.sql` is outdated.
- This keeps running instances functional but means `init.sql` is not fully aligned with latest runtime achievement definition model.

## 6. Frontend Module Structure

Feature folders:

- `auth`
- `slime`
- `tasks`
- `focus`
- `customization`
- `analytics`
- `leaderboard`

Primary app tabs:

- Dashboard
- Analytics
- Leaderboard
- Focus Session
- Tasks
- Achievements
- Customize

## 7. Dev-Only Feature Registry (Important For Future Removal)

Current dev-only backend endpoints:

- `/api/slime/test-user`
- `/api/slime/me/dev-xp`
- `/api/slime/me/dev-reset-xp`
- `/api/slime/me/dev-reset-achievements`
- `/api/customization/wallet/dev-add`
- `/api/customization/dev-reset-progress`

Current dev-only frontend controls:

- Dashboard:
  - `+60 XP (Dev)`
  - `Reset XP (Dev)`
  - `Reset Achievements (Dev)`
- Customize:
  - `Demo +100 Coins`
  - `Reset Earned Cosmetics`

UI gate rule:

- Dev controls are shown only when hostname is `localhost` or `127.0.0.1`.

Backend gate rule:

- Dev endpoints only registered when `NODE_ENV !== 'production'`.
- Slime dev endpoints explicitly return `404` in production router config.

## 8. Testing and Validation Practices Used

Typical commands used per feature step:

- `npm --prefix backend run typecheck`
- `npm --prefix frontend run build`
- Targeted tests where relevant (for example, production route gating tests).

Observed in workflow:

- Frequent incremental typecheck/build verification after each feature batch.
- Production gating coverage exists at least for slime dev endpoints.

## 9. Environment and Operations Notes

Monorepo scripts:

- Root:
  - `npm run setup`
  - `npm run dev`
  - `npm run build`
  - `npm run check:release`
- Backend:
  - `npm --prefix backend run dev`
  - `npm --prefix backend run typecheck`
  - `npm --prefix backend test`
- Frontend:
  - `npm --prefix frontend run dev`
  - `npm --prefix frontend run build`

Docker:

- `docker compose up --build` runs frontend, backend, db, pgadmin stack.

## 10. Known Gaps / Cleanup Candidates

- Align `db/init.sql` with runtime achievements schema (`achievement_key` and latest seed set).
- Add dedicated tests for:
  - analytics endpoint correctness
  - leaderboard ranking correctness
  - customization dev reset behavior
- Track and decide final production policy for currently static dashboard cards.
- Implement local/group leaderboard logic (currently intentionally disabled).

## 11. Near-Term Roadmap Reference

Immediate completed trajectory:

- Achievements implemented and moved to dedicated tab.
- Analytics MVP implemented.
- Leaderboard MVP (global only) implemented.

Likely next product iteration:

1. Local/group leaderboard backend data model and membership logic.
2. Analytics expansion (streaks, session analytics, weekly comparisons).
3. Dev-feature removal pass before production freeze.

## 12. Dev Feature Removal Playbook (For "Remove All Dev Features" Request)

When entering production cleanup mode, remove in this order:

1. Frontend dev UI hooks:
   - Remove localhost gate branches and dev buttons from dashboard/customization components.
2. Frontend dev API methods:
   - Remove dev reset/dev add functions from feature API modules and exports.
3. Backend dev routes:
   - Remove dev route registrations from slime/customization routers.
4. Backend dev controllers/services:
   - Remove dev endpoint handlers and reset helpers if no longer needed.
5. Tests/docs:
   - Update/remove production-404 tests tied to removed endpoints.
6. Final verification:
   - Full backend typecheck + tests.
   - Frontend build + smoke pass on core tabs.

Goal for removal pass:

- No change to core progression behavior.
- No broken imports from deleted dev APIs.
- No orphaned UI controls.

## 13. Single-Source Files To Re-open First In Future Sessions

If resuming work after long context gaps, open these first:

- `frontend/src/app/App.tsx`
- `frontend/src/features/slime/components/SidebarNav.tsx`
- `backend/src/app.ts`
- `backend/src/routes/slimeroutes.ts`
- `backend/src/routes/customizationRoutes.ts`
- `backend/src/routes/analyticsRoutes.ts`
- `backend/src/routes/leaderboardRoutes.ts`
- `backend/src/services/xpService.ts`
- `backend/src/services/achievementService.ts`
- `backend/src/services/customizationService.ts`
- `backend/src/services/analyticsService.ts`
- `backend/src/services/leaderboardService.ts`

These files represent the current functional spine of the app.

## 14. GitHub Commit and Push Reference (Detailed)

This section ties product evolution to Git history so future sessions can re-anchor quickly.

Important accuracy note:

- Local git records commits, not exact push events.
- "Push reference" here means commit presence on `origin/main` and linear history on `main`.
- Current observed state at the time of writing:
  - Branch: `main`
  - Upstream: `origin/main`
  - `HEAD`: `53c2f9e`
  - `origin/main`: `53c2f9e`

## Full chronological commit chain (repo start -> latest pushed commit)

| Date | Commit | Message | Project significance |
|---|---|---|---|
| 2026-02-09 | `f11dd44` | Setting up the Repo | Repo bootstrap start |
| 2026-02-11 | `14ff68d` | Adding CI workflow configuration | Initial CI path |
| 2026-02-11 | `db665a7` | Added package.json | Root dependency scaffolding |
| 2026-02-11 | `806f866` | Added package-lock.json | Lockfile baseline |
| 2026-02-11 | `360aeec` | Install Jest and updated the dependencies | Testing toolchain setup |
| 2026-02-11 | `7aac8e9` | Fix Jest installation for CI | CI test reliability |
| 2026-02-11 | `98f7b1a` | Fixed permission issue for Jest | CI stability |
| 2026-02-11 | `4b15d68` | Upgraded Jest to latest version | Test stack update |
| 2026-02-11 | `f34d053` | Fixed node version | Runtime compatibility fix |
| 2026-02-11 | `e19d2a1` | Fixing | Iterative patch |
| 2026-02-11 | `56cf000` | Using only node version 16 | CI/runtime pinning |
| 2026-02-11 | `0f73de3` | Fixing | Iterative patch |
| 2026-02-11 | `12f75ef` | Created a config file for jest | Structured test config |
| 2026-02-11 | `6530bd8` | Fixed jest configuration for ES module | ESM compatibility |
| 2026-02-11 | `c721836` | Created test file example | Baseline tests |
| 2026-02-11 | `b0f0b9e` | Updated ci.yml file | CI adjustments |
| 2026-02-11 | `939e90e` | Fixing minor error | Minor repair |
| 2026-02-11 | `644148f` | Installed fastify, dotenv, other dependencies | Early backend dependency setup |
| 2026-02-11 | `c1b14a7` | Successfully got /api/users route working, set up backend and frontend routes | First functional API/frontend route stitch |
| 2026-02-12 | `698c896` | proper working project setup with Docker and basic backend structure | Containerized local dev baseline |
| 2026-02-12 | `915b606` | Added jest test in backend | Backend test iteration |
| 2026-02-12 | `52c4e91` | Added fix line for frontend package.json | Frontend package fix |
| 2026-02-12 | `d255d81` | Added fix for frontend | Frontend stability |
| 2026-02-12 | `1260ed3` | Updated so database connection works with frontend | DB/frontend integration |
| 2026-02-14 | `048fe33` | refactored frontend: cleaner src structure and moved app entry files | Frontend structure cleanup |
| 2026-02-14 | `9dd6fdf` | feat frontend: make sidebar clickable to toggle collapse, button implementation | Sidebar UX behavior |
| 2026-02-14 | `9f3d397` | refactor frontend: extracting quickstats and system status into slime feature components | Slime feature modularization |
| 2026-02-14 | `27a224b` | refactor frontend: extract connection alert, slime companion card, and activity feed components | Dashboard componentization |
| 2026-02-14 | `a33193d` | refactor(frontend): move slime data fetching into feature api and useSlimeData hook | API/hook separation |
| 2026-02-14 | `b6c8499` | refactor frontend: add slime barrel exports, shared API contracts, and selectors; simplify app orchestration | Feature boundary cleanup |
| 2026-02-14 | `eb78a59` | Created study timer wheel and personalization section | Focus feature foundations |
| 2026-02-14 | `56ee73e` | Created tasks front end | Task UI baseline |
| 2026-02-17 | `3f43bcd` | feat(tasks): add backend task endpoints and polish app shell transitions | Tasks backend API complete |
| 2026-02-17 | `4474114` | feat frontend: connect tasks board to backend tasks API with loading/error states | Tasks full-stack integration |
| 2026-02-17 | `89b4360` | fix dev-db : move docker postgres to 5433 and wire frontend session bootstrap to dynamic user id | Local env and user bootstrap reliability |
| 2026-02-17 | `79bb2d3` | feat auth : add JWT login/register/me flow, protect slime/tasks routes, and wire frontend auth + token-based APIs | Full auth rollout |
| 2026-02-17 | `c6b9b6f` | feat auth-security : add login lockout + audit logging and improve auth form reset behaviour | Security hardening |
| 2026-02-18 | `dea92dc` | chore security : enforce env-based CORS allowlist and disable test-user route in production | Production safety |
| 2026-02-18 | `abc0ba1` | test security : add authorization, CORS, and production test-user route coverage | Security test coverage |
| 2026-02-18 | `4d20af9` | chore release : add deploy checklist, production env fail-fast guards, and unified release checks | Release governance |
| 2026-02-19 | `fceb884` | chore(dev-setup): add env templates, commit safety hook, and local bootstrap workflow | Developer workflow guardrails |
| 2026-02-19 | `c81cad2` | chore(dev-setup): add env templates, commit safety hook, and local bootstrap workflow | Follow-up setup adjustments |
| 2026-02-19 | `9fe43b9` | focus session lock implemented | Focus lock enforcement |
| 2026-02-23 | `f18629f` | feat customization : add backend-backed wallet/shop and reflect slime loadout on dashboard | Customization progression |
| 2026-02-24 | `a790d0c` | feat(customization): add slime skin assets and proportional face scaling | Visual polish + face scaling |
| 2026-02-27 | `6930d71` | organised css | Styling reorganization |
| 2026-03-03 | `854be22` | Level up implemented | XP/level progression milestone |
| 2026-03-03 | `53c2f9e` | feat achievements : move achievements to dedicated tab and expand backend to 8 achievements with progress state | Achievements tab + 8-badge model |

## Post-`53c2f9e` in current local working tree (not yet committed/pushed)

These are currently implemented in working files but not represented by a new commit hash yet:

- Analytics backend + frontend tab
- Leaderboard backend + frontend tab (global live, local/group disabled)
- Customize moved into main tab list
- Dev customization reset endpoint + UI button (`Reset Earned Cosmetics`)
- Extended project memory documentation (`PROJECT_NOTES.md`)

## 15. Prompt-to-Implementation Ledger (This Chat Session)

Purpose:

- Preserve exact user prompt intent and resulting implementation in a durable format for future chats.
- This is the "session memory" layer above commit history.

Legend:

- `Prompt`: short capture of user instruction.
- `Implementation`: what changed.
- `Status`: `done`, `in_progress`, or `note_only`.
- `Validation`: checks run in-session.

### Entry 2026-03-03-01

- Prompt: Implement Achievements MVP first (backend-evaluated, persisted, rendered frontend).
- Implementation:
  - Added `achievementService` with runtime schema ensure and evaluation logic.
  - Wired achievement evaluation into task completion/customization unlock/slime fetch flows.
  - Added achievements panel on frontend and type support.
- Status: done
- Validation:
  - backend typecheck passed
  - frontend build passed

### Entry 2026-03-03-02

- Prompt: Add dev slime XP reset and achievement reset, keep as dev-only and removable later.
- Implementation:
  - Added `POST /api/slime/me/dev-reset-xp`
  - Added `POST /api/slime/me/dev-reset-achievements`
  - Added localhost-only dashboard buttons and API calls.
  - Added production-route tests for dev slime endpoints returning `404`.
- Status: done
- Validation:
  - backend typecheck passed
  - frontend build passed
  - targeted backend test passed

### Entry 2026-03-03-03

- Prompt: Move achievements into a dedicated tab, remove from dashboard, set to eight achievements.
- Implementation:
  - Added `Achievements` main tab route.
  - Removed achievements panel from dashboard.
  - Expanded achievements to 8 (`task_25`, `xp_1000` added).
  - Added `achievementProgress` payload and locked/unlocked UI states.
- Status: done
- Validation:
  - backend typecheck passed
  - frontend build passed

### Entry 2026-03-03-04

- Prompt: Implement analytics next.
- Implementation:
  - Added backend endpoint `GET /api/analytics/me/summary`.
  - Added analytics feature module on frontend.
  - Added `Analytics` tab with KPI cards + 7-day trend charts.
- Status: done
- Validation:
  - backend typecheck passed
  - frontend build passed

### Entry 2026-03-03-05

- Prompt: Move customize from bottom sidebar, add customization reset for earned cosmetics, then leaderboard with global + greyed local/group.
- Implementation:
  - Moved `Customize` into main sidebar tabs.
  - Added dev-only customization reset endpoint `POST /api/customization/dev-reset-progress`.
  - Added `Reset Earned Cosmetics` button in customization UI (localhost-only).
  - Added leaderboard backend (`GET /api/leaderboard/global`) and frontend leaderboard tab.
  - Local and group leaderboard buttons are disabled (`Soon`).
- Status: done (working tree, not yet committed at time of writing)
- Validation:
  - backend typecheck passed
  - frontend build passed

### Entry 2026-03-03-06

- Prompt: Explain context window exhaustion behavior.
- Implementation: explanatory guidance only, no code changes.
- Status: note_only
- Validation: n/a

### Entry 2026-03-03-07

- Prompt: Create highly detailed `PROJECT_NOTES.md` timeline from start until now.
- Implementation:
  - Added initial long-form `PROJECT_NOTES.md`.
- Status: done (file created in working tree)
- Validation: file created and reviewed

### Entry 2026-03-03-08

- Prompt: Add even more detail, reference GitHub pushes, and log every prompt/implementation going forward.
- Implementation:
  - Expanded notes with commit/push reference timeline and prompt ledger.
  - Added strict update protocol section below.
- Status: done
- Validation: section added in file

## 16. Persistent Notes Update Protocol (Required Going Forward)

Rule to follow for all future coding sessions on this project:

1. For every user prompt that changes scope/requirements, append a new ledger entry in this file under Section 15.
2. For every implementation step, record:
   - backend files changed
   - frontend files changed
   - endpoint or contract changes
   - dev-only gating implications
   - validation commands run and result
3. If a commit is created, append commit hash and message to the corresponding ledger entry.
4. If a push is confirmed, annotate entry with push target (for example, `origin/main`).
5. If no code was changed, still add `note_only` entry for decision continuity.

Template for new entries:

```md
### Entry YYYY-MM-DD-XX
- Prompt:
- Implementation:
- Files touched:
- API/DB contract impact:
- Dev-only impact:
- Status: done | in_progress | note_only
- Validation:
- Commit:
- Push:
```

## 17. Current Uncommitted Snapshot (At Time Of This Update)

Working tree currently includes uncommitted feature work beyond `origin/main` commit `53c2f9e`:

- Backend:
  - analytics route/controller/service
  - leaderboard route/controller/service
  - customization dev reset additions
  - app route registration updates
- Frontend:
  - analytics feature module
  - leaderboard feature module
  - sidebar tab structure updates
  - customization dev reset API/hook/UI button
  - app-level tab routing and styles
- Docs:
  - `PROJECT_NOTES.md` added and expanded

This section should be refreshed after each commit batch so it reflects true repo state.
