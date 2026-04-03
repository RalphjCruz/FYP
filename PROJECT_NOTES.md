# MySlime Project Notes (Definitive Session Record)

Last updated: 2026-04-03 (Europe/Dublin)
Owner: Ralph Jude Cruz
Repo: `https://github.com/RalphjCruz/FYP`
Branch baseline used during this note update: `main`

---

## 1) Project Identity

MySlime is a gamified productivity web app:
- Productive behavior increases slime progression.
- Inactivity/distraction behavior should eventually reduce slime health (planned/partially prototyped).
- The system is being built as a full-stack modular monolith with a feature-based frontend.

Core directional constraints from this session:
- Keep code explainable for FYP panel/supervisor.
- Build in small steps, test after each feature step.
- Prefer practical progress over overengineering.
- Keep dev-only controls removable before production.

---

## 2) Architecture and Stack

### Architecture model
- Backend: modular monolith (Express + layered services/controllers/routes).
- Frontend: feature-based module structure (auth, slime, focus, tasks, customization, analytics, leaderboard).
- Data: PostgreSQL.
- Local orchestration: Docker Compose.
- Deployment: Vercel (frontend), Railway (backend + Postgres).

### Backend stack
- Node.js + TypeScript (`type: module`)
- Express 5
- `pg` for Postgres
- `jsonwebtoken` for auth
- `bcrypt` for password hashing

### Frontend stack
- React + TypeScript
- Vite
- CSS (split into `tokens/base/layout` + feature styles)

---

## 3) Repository Structure (current intent)

- `backend/`
  - `src/controllers/*`
  - `src/services/*`
  - `src/routes/*`
  - `src/middlewares/*`
  - `src/config/*`
- `frontend/`
  - `src/app/*`
  - `src/features/auth/*`
  - `src/features/slime/*`
  - `src/features/focus/*`
  - `src/features/tasks/*`
  - `src/features/customization/*`
  - `src/features/analytics/*`
  - `src/features/leaderboard/*`
- `db/init.sql`
- `docs/*`
- `PROJECT_NOTES.md`

---

## 4) Current Script Surface

### Root (`package.json`)
- `npm run setup`
- `npm run dev` (docker compose up)
- `npm run build` (docker compose build)
- `npm run check:backend`
- `npm run check:frontend`
- `npm run check:release`
- `npm run stop`
- `npm run clean`

### Backend
- `npm --prefix backend run dev`
- `npm --prefix backend run typecheck`
- `npm --prefix backend test`

### Frontend
- `npm --prefix frontend run dev`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`

---

## 5) Full Development History (Detailed)

This section captures the broad history from this context window and prior continuity referenced in it.

### 5.1 Early Build-up
- Initial repo + CI setup created.
- Multiple Jest/Node/ESM CI fixes were applied.
- Early dependencies included Fastify at one point historically, but project converged on Express.
- Dockerized backend/frontend/db baseline introduced.

### 5.2 Auth and Security Foundation
- JWT auth implemented (`register`, `login`, `me`).
- Password hashing with bcrypt added.
- Auth middleware added for protected routes.
- Login abuse protection added:
  - failed attempt tracking
  - temporary lockout
  - audit logging
- CORS hardened to env allowlist.
- Production test-user route disabled.
- Security tests added (authorization/CORS/dev route checks).

### 5.3 Frontend Modularization Wave
- App shell refactored into feature components:
  - `QuickStats`, `SystemStatus`, `ConnectionAlert`, `ActivityFeed`, `SlimeCompanionCard`
- Slime data moved to feature hook/API (`useSlimeData`, `slimeApi`).
- Barrel exports introduced to reduce deep imports.
- Sidebar collapse and responsive behavior iterated.

### 5.4 Focus Feature Evolution
- Wheel-style focus timer added.
- Survey-based study personalization introduced.
- Focus page made dedicated (not just card fragment).
- Session locking behavior iterated heavily:
  - tab/window leave handling
  - pause removal
  - start/reset stability bugs fixed in multiple passes
- Warning UX switched from browser alert/confirm style to in-app warnings.
- Popup focus mode prototyped.

### 5.5 Focus Guard Experiment (and rollback)
- Local companion/guard concept was discussed and partially prototyped to detect distracting apps.
- Constraint discovered and documented clearly:
  - web app cannot directly inspect local desktop processes in production browser context.
- Strategy was scaled back/rolled back where needed.

### 5.6 Tasks Full-stack
- Task API integrated with frontend.
- Tasks CRUD + complete actions implemented.
- Difficulty and reward logic integrated.
- Later linked to XP progression logic server-side.

### 5.7 Deployment Journey (Railway + Vercel)
- Backend deployed to Railway.
- Postgres provisioned on Railway.
- Frontend deployed on Vercel.
- `/health` used as deployment sanity check.
- CORS wired to exact frontend domain(s).

Common deployment/debug events resolved during this window:
- Docker daemon not running / missing pipe errors.
- Wrong path typo (`frontent` vs `frontend`).
- DB host mismatch (`ENOTFOUND db`) due env mismatch outside compose.
- Duplicate user creation collision on test endpoint.
- `psql` install/connect friction on Windows PowerShell.
- Railway Postgres UI loading issue worked around via direct `psql` verification.

### 5.8 Dev Workflow Hardening
- `.env.example` patterns formalized.
- commit hook safeguards introduced (prevent accidental secret commits).
- local setup flow documented for second-laptop onboarding.
- repeated guidance adopted: small commits + check before push.

### 5.9 Customization + Wallet
- Backend-backed customization introduced:
  - wallet
  - catalog
  - inventory
  - loadout
  - daily claim
- Dashboard slime reflects equipped customization.
- Color skins added using PNG assets.

### 5.10 Visual/Styling Iteration Loop
Large iterative tuning happened on slime visuals:
- consistent slime render across dashboard/focus/customize
- face overlay (eyes/mouth) over image skins
- numerous scale/offset iterations due transparent-padding image assets
- refactor to shared face geometry + per-view calibration
- CSS split started (`tokens/base/layout` + feature style extraction)

### 5.11 Progression Features
- XP non-linear leveling introduced (higher level => more XP required).
- Dev XP add path for fast testing (non-production).
- task completion awards XP transactionally and avoids duplicate award if already completed.
- slime API enriched with progression fields (total + per-level progress values).

### 5.12 Achievements / Analytics / Leaderboard history in context
Across this context window, achievements/analytics/leaderboard were discussed and partially/fully implemented in different passes, with some restructuring and reversions requested at times.
Current planning lock requested by user:
1. XP/level stable first
2. Achievements
3. Analytics
4. Leaderboard

---

## 6) Deployment History and Operating Notes (Practical)

### Production services used
- Railway:
  - backend service
  - Postgres service
- Vercel:
  - frontend app

### Known live domains used during session
- Backend: railway-generated domain (varied by deploy)
- Frontend: vercel-generated domain(s)

### Deployment sanity checklist repeatedly used
1. Backend deploy successful
2. `GET /health` returns OK JSON
3. DB schema present
4. Frontend points to backend via `VITE_API_URL`
5. `CORS_ORIGIN` matches frontend URL(s)
6. register/login/task/slime smoke test passes

### Cost and pause notes discussed
- Railway trial credits monitored.
- Pausing strategy discussed (disconnect source/remove deployment/scale strategy depending on UI options).
- Redeploy-later workflow accepted as valid.

---

## 7) Current Domain Model (as practiced)

### Core entities
- users
- slimes
- tasks
- achievements
- user_achievements
- customization_wallets
- user_customization_inventory
- user_customization_loadout
- auth_login_guards
- auth_audit_logs
- slime_xp_events

### Slime progression model (current direction)
- total XP stored server-side
- level derived by non-linear progression curve
- evolution stage derived from level brackets
- frontend displays:
  - total xp
  - xp in current level
  - xp needed for next level
  - progress percent

---

## 8) API Surface (important/currently referenced)

### Core
- `GET /health`
- `GET /`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Slime
- `GET /api/slime/health`
- `GET /api/slime/me`
- `GET /api/slime/:userId` (guarded)
- `POST /api/slime/test-user` (dev only)
- `POST /api/slime/me/dev-xp` (dev only)

### Tasks
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`
- `POST /api/tasks/:taskId/complete`
- `DELETE /api/tasks/:taskId`

### Customization
- `GET /api/customization/overview`
- `POST /api/customization/wallet/claim-daily`
- `POST /api/customization/items/unlock`
- `POST /api/customization/items/equip`
- `POST /api/customization/wallet/dev-add` (dev only)
- plus dev reset flows discussed/used in this context window

### Analytics / Leaderboard
- analytics and leaderboard endpoints were implemented in this context cycle and iterated around tab behavior and display expectations.

---

## 9) UX and Product Decisions Recorded in Context

### Navigation
- User preferred clean main tabs over cluttered side sections.
- Currency as separate sidebar tab was explicitly rejected at one point.
- Coin visibility should be integrated into existing surfaces (dashboard/customize cards).

### Focus behavior
- User preference: strict flow during session.
- Pause was removed by request in one iteration.
- In-app warning preferred over browser-native popups.

### Cosmetics and assets
- User generating custom assets and integrating incrementally.
- Prompt templates for asset generation created and refined.
- image-backed cosmetics prioritized over placeholder gradients.

### Slime face/health future
- Future plan captured:
  - expressions tied to health (happy -> neutral -> sad -> dead/X-eyes)
- Face overlay system retained to support that future without replacing skin assets.

---

## 10) Frontend Styling Refactor State

### Completed split
- `frontend/src/app/styles/tokens.css`
- `frontend/src/app/styles/base.css`
- `frontend/src/app/styles/layout.css`

### Additional split in progress/completed during this session
- `frontend/src/features/focus/styles.css`
- `frontend/src/features/customization/styles.css`

### Why this matters
- Reduces monolithic `App.css`
- Isolates feature styling for safer iteration
- Keeps slime calibration variables centralized

---

## 11) Known Pain Points / Recurring Issues

1. **Slime image padding mismatch** across contexts
- dashboard/focus/loadout preview need per-view image-fit calibration even with shared geometry.

2. **Docker frontend caching confusion**
- many visual changes require rebuild + hard refresh when running static Docker frontend.

3. **Dev vs production behavior confusion**
- dev-only routes and buttons intentionally differ; must confirm prod gating before release.

4. **Schema drift risk**
- runtime table/column creation by services can diverge from `db/init.sql` if not synchronized periodically.

---

## 12) Verification Culture Used in This Project

After each feature step, typical checks:
- backend: `npm --prefix backend run typecheck`
- frontend: `npm --prefix frontend run build`
- manual smoke in browser for changed flow

Frequent manual flows:
- auth register/login
- slime dashboard load
- focus start/reset behavior
- customization unlock/equip persistence
- task complete progression impact

---

## 13) Commit History Snapshot (recent high-signal)

From `git log` in this context:
- `672ecc7` updated project notes
- `c3b481d` analytics + leaderboard MVP + customize tab move + customization dev reset
- `53c2f9e` achievements moved to dedicated tab + expanded progress model
- `854be22` level up implemented
- `6930d71` css organization
- `a790d0c` slime skin assets + proportional face scaling
- `f18629f` backend-backed customization wallet/shop reflected on dashboard
- `9fe43b9` focus session lock
- earlier auth/security/release/dev-setup commits as foundation

---

## 14) Current Requested Sequence (locked by user)

User-requested next implementation order:
1. XP leveling fixes (done in this pass)
2. Achievements (next)
3. Analytics (after achievements)
4. Leaderboards (after analytics/achievement reliability)

Additionally requested during this window:
- one feature at a time
- detailed test instructions after each feature
- commit message suggestions

---

## 15) Detailed Interaction Ledger (context-window digest)

### A) Strategy + architecture discussions
- Fastify vs Express: stayed with Express for pace/stability.
- Monolith vs microservices: stick to modular monolith for FYP scope.
- Security level: baseline production-safe controls sufficient for FYP, not enterprise-grade hardening.

### B) Infra/deployment mentoring highlights
- Railway setup guided step-by-step from blank project screen.
- Postgres schema setup via SQL editor/psql.
- Vercel root directory + env setup clarified.
- Auto-deploy verification for both platforms explained.
- Domain setup process explained.
- Free tier limits discussed for Vercel and Railway.

### C) Operational troubleshooting highlights
- Docker engine not running errors.
- wrong frontend path typo.
- local env/db host mismatch errors.
- auth duplicate key user creation case.
- module resolution `.js` in TS ESM runtime contexts.
- CORS preflight failures when backend crashed / missing proper response.

### D) Focus feature loop highlights
- start-session deadlock bugs fixed in several iterations.
- lock and warning behavior adjusted per user preference.
- popup mode explored.
- local focus-guard concept explored then constrained due browser sandbox.

### E) Customization + visual loop highlights
- color skins integrated from local `images/` folder.
- shop display filtered/tuned around image-backed assets.
- repeated face alignment and scaling corrections across contexts.
- eventual move toward shared dynamic face scaling with per-view calibration.

### F) Documentation and process highlights
- project summaries requested repeatedly for supervisor/judge explanation.
- architecture explanation style requested at mixed technical + simplified depth.
- roadmap and PRD iteration support requested repeatedly.

---

## 16) What Is Live in Code vs What Is Planned

### In-code (confirmed by this session context)
- auth + lockout + route protection
- tasks CRUD + complete
- slime fetch and display
- focus module
- customization wallet/inventory/loadout
- image-backed slime colors
- non-linear XP progression service and task XP awarding
- CSS modularization in progress (tokens/base/layout + feature css files)

### Planned/next
- achievements final pass for current XP model
- simple analytics display pass aligned to current product KPIs
- leaderboard stabilization and data confidence
- health-driven facial expressions (future stage)

---

## 17) Cross-Device Setup (agreed workflow)

On new machine:
1. clone repo
2. `npm run setup`
3. copy env templates:
   - `backend/.env.example -> backend/.env`
   - `frontend/.env.example -> frontend/.env`
4. run stack (`npm run dev` or split local mode)

Team workflow expectation:
- pull before session
- small feature commit
- run checks before push
- avoid committing secrets (`.env` and keys blocked by hooks)

---

## 18) Release/Beta Checklist Used in This Context

Before redeploy for friend testing:
1. hide/disable dev-only UI controls in prod
2. verify dev-only API routes are not active in production
3. run local checks (typecheck/build)
4. deploy backend/frontend
5. smoke test live:
   - register/login
   - dashboard loads
   - focus starts/resets
   - customization purchase/equip persists
   - task completion reflects progression

---

## 19) Current Working Tree Note

At the moment this file was rewritten:
- `PROJECT_NOTES.md` is modified.
- Other file status should be checked via `git status` before creating a commit.

---

## 20) Next Action Recommendation

Implement **Achievements** as the next isolated feature step against the new XP model:
- backend evaluate + persist
- frontend render
- explicit manual tests
- one commit for achievements only

After that, do analytics in the same isolated pattern.

---

## 21) Quick Prompt for Future Session Continuity

Use this instruction in new chats:

- "Continue MySlime from PROJECT_NOTES.md. Work one feature at a time, keep changes small, run backend typecheck and frontend build after each feature, give manual tests and commit message at the end. Next feature: Achievements against the current non-linear XP system." 

---

## 22) Full Prompt History Digest (Readable Context Record)

This section converts the full prompt stream from this context window into structured notes so future sessions can recover intent even after chat history is truncated.

### 22.1 Early backend/framework clarification prompts

User prompts included:
- "Where in my code has fastify?"
- "What am I using instead?"
- "Is there a way to integrate fastify instead of express at my current stage or should I stick to express?"

Outcome captured:
- Project is currently Express-based.
- Recommendation and direction during session: stay on Express for delivery speed and consistency; do not migrate framework mid-build unless required.

### 22.2 Structure and PRD planning prompts

User prompts included:
- "Analyze my folder/file structure based on my PRD."
- "Step-by-step process, panel-ready code, test after each implementation."
- "I have GitHub CI/CD setup already."
- "Prioritize modular frontend component separation."
- "Checklist format + explain changes + tests."

Outcome captured:
- Adopted incremental implementation style:
  - small feature slices,
  - frequent tests,
  - clear commit boundaries,
  - explanation-first notes.
- Architecture framed as modular monolith backend + feature-based frontend.

### 22.3 Pace, rollback, and learning-mode prompts

User prompts included:
- "Go slower."
- "Remove backend changes."
- "Delete AppShell/app-level files at points."
- "Explain architecture in high-level software engineering terms."
- "Dumbify/explain terms: lint, endpoint verbs, res.status, API, shared contract, barrel export."

Outcome captured:
- Collaboration style shifted repeatedly to:
  - slower pace,
  - educational explanations,
  - reversible steps,
  - user-controlled commit cadence.

### 22.4 Architecture decision prompts (strategic)

User prompts included:
- "Can this be full stack?"
- "What architecture am I following?"
- "What is modular monolith?"
- "Monolith vs microservices?"
- "Can this scale to many users?"
- "Advantages/disadvantages of modular monolith."

Outcome captured:
- Strategic decision reinforced:
  - stay modular monolith for FYP scope + launch feasibility,
  - defer microservices until proven scaling need.

### 22.5 Documentation and roadmap prompts

User prompts included:
- "PRD and roadmap download/PDF."
- "Compare to interim report."
- "Adjust writing tone."
- "How many steps before deployment?"
- "What are next 10 steps?"

Outcome captured:
- Multiple roadmap/PRD cycles were run.
- Scope repeatedly reset to MVP-first execution.
- User prioritized practical shipping over documentation polish.

### 22.6 Frontend UX iteration prompts

User prompts included:
- Sidebar collapse + theme consistency.
- Refactor App.tsx/App.css if needed.
- Make responsive behavior persistent.
- "Fix transition glitches."
- "Modern/minimal UI polish."
- "Separate files as needed."

Outcome captured:
- Sidebar behavior and app shell were iteratively refined.
- UI refactors favored modular component extraction.
- Responsiveness and polish were continuously tuned.

### 22.7 Focus feature prompts (multi-round)

User prompts included:
- Implement focus timer.
- Change to wheel timer.
- Remove pomodoro mode complexity for now.
- Add study survey personalization.
- Show slime in same screen.
- Auto-adjust timer based on selection.
- Consider long-term dynamic personalization from database.
- Add popup mode.
- Prevent pause/strict session behavior.
- Replace browser warnings with in-app warnings.
- Fix repeated start-session bugs.
- Keep focus behavior enforceable.

Outcome captured:
- Focus timer feature became dedicated and heavily iterated.
- Session lock/start/reset logic underwent multiple bug-fix cycles.
- Warning UX changed to in-app message style.
- Popup and focus guard concepts were explored; production limitations documented.

### 22.8 Backend/dev environment troubleshooting prompts

User prompts included:
- Missing script/typecheck confusion.
- Docker engine/compose errors.
- localhost URL confusion.
- env mismatch and DB auth errors.
- psql install/connect issues on Windows.
- duplicate key errors on test user.
- CORS preflight failures when backend failed.

Outcome captured:
- Local setup hardening was added:
  - `.env.example` files,
  - setup scripts,
  - hooks,
  - cleaner dev instructions.
- Deployment debugging flow was stabilized.

### 22.9 Deployment hand-holding prompts

User prompts included:
- "Step-by-step deployment."
- Railway/Vercel click-by-click guidance with screenshots.
- DB initialization and health checks.
- CORS + env wiring.
- View DB entries.
- Domain setup and hosting limits.
- Pause Railway/cost management.

Outcome captured:
- End-to-end deploy path was completed and documented.
- Live smoke testing flow was established.
- User gained repeatable deploy/redeploy procedure.

### 22.10 Security expectation prompts

User prompts included:
- "Does it need to be very secure for FYP?"
- "What token stuff is this?"
- "Would deploy require different setup?"

Outcome captured:
- Security posture standardized to pragmatic baseline:
  - bcrypt,
  - JWT auth,
  - route protection,
  - CORS allowlist,
  - login lockout and audit logs,
  - secrets via env vars.

### 22.11 Git workflow and commit prompts

User prompts included:
- "What should commit message be?"
- "Commit and push for me" (at times).
- "How to avoid pushing env/package issues."
- "Cross-laptop flow."

Outcome captured:
- Commit-style discipline adopted (feature-scoped messages).
- Safety hooks introduced for secret-protection.
- Consistent pre-push checks adopted.

### 22.12 Customization/shop prompts

User prompts included:
- "Implement achievements/customization/currency/leaderboard."
- "No currency sidebar."
- "Show currency as image-style HUD."
- "Customization should show acquired item and work."
- "Remove non-image store items."
- "Use images from root images folder."
- "Increase/decrease slime sizes and align overlays."
- "Set hat/trail to none when unavailable."

Outcome captured:
- Customization/wallet/loadout backend-backed flow established.
- Shop repeatedly adjusted toward real asset-backed cosmetics.
- Multiple visual tuning loops on slime render and face overlay.

### 22.13 Asset generation prompts

User prompts included:
- "Give me one prompt template for asset generation."
- "Can you implement animation?"
- "What is color context for?"
- "Will these generated assets work?"

Outcome captured:
- Reusable single-item prompt templates were provided.
- Asset pipeline guidance formalized:
  - transparent PNG,
  - consistent canvas/alignment,
  - slot-based integration.
- Animation feasibility scoped by format and architecture.

### 22.14 Slime face/scaling prompts (detailed calibration cycle)

User prompts included:
- Make eyes/mouth proportional to slime size.
- Keep consistency between dashboard/focus/customize.
- Fix offset in focus.
- Make pupils larger / centered.
- Request full dynamic scaling refactor if needed.

Outcome captured:
- Refactor shifted to shared geometry ratios:
  - eye size ratio,
  - eye spacing ratio,
  - pupil ratio relative to eye,
  - mouth width/height ratios.
- Per-view calibration retained only where image padding differs.
- Focus alignment required extra x-shift calibration.

### 22.15 Feature-order lock prompts (latest)

User prompts included:
- "I want XP leveling then achievements then analytics then leaderboard."
- "One feature at a time."

Outcome captured:
- Execution order locked:
  1) XP + leveling
  2) Achievements
  3) Analytics
  4) Leaderboard

### 22.16 Latest implemented feature in this window

Prompt intent:
- fix XP and level progression with increasing XP cost per level.

Implemented:
- Non-linear XP service (`xpService`).
- Task completion awards XP transactionally.
- Slime API now returns richer progression values.
- Dev XP route (non-prod) + localhost dev button.
- Frontend selectors use backend progression values.

Validation run:
- backend typecheck passed.
- frontend build passed.

### 22.17 User-requested note persistence behavior

Final prompt intent:
- "Include all details/history from context window into project notes because context may roll off."

This section fulfills that request by preserving:
- strategic decisions,
- implementation pivots,
- revert cycles,
- deployment history,
- debugging history,
- UX tuning history,
- and current next-step locks.

### 22.18 Session continuity rule (explicit)

For future sessions, treat Section 22 as the canonical readable history digest when raw chat context is unavailable.

When new work is done, append:
- what prompt asked,
- what changed,
- what was tested,
- what commit hash captured it.

---

## 23) Chronological Prompt Chronicle (Expanded History Record)

This section records the user prompt journey in chronological blocks so new sessions can reconstruct intent and rationale quickly.

### 23.1 Initial architecture and stack direction
- Asked where Fastify exists in code.
- Asked what stack is currently used instead.
- Asked whether to migrate to Fastify now or stay with Express.
- Asked for folder/file structure analysis against PRD.
- Asked for implementation to be step-by-step, testable each step, and presentation-ready for judges.
- Confirmed GitHub CI/CD already exists.
- Asked to prioritize modular frontend components and no Bootstrap.

### 23.2 Early process/pace resets and cleanup requests
- Asked for checklist format: explain change + how to test + how it works.
- Requested frontend-first changes.
- Requested slower pace and smaller increments.
- Requested backend change removal at one point.
- Asked basic definitions while learning (`lint`, architecture terms, endpoint terms).
- Requested app shell file removals/refactors (`AppShell.tsx`, `App.tsx`) as structure evolved.
- Asked for architecture explanation in high-level engineering language plus simplified explanation.

### 23.3 Product strategy and architecture questions
- Asked if project can become full stack (answer: yes).
- Asked if assistant can keep memory/checkpoints and progress summaries.
- Asked naming and explanation of architecture pattern.
- Asked modular monolith meaning, bootstrapping meaning, and alternative architectures.
- Asked monolith vs microservices and whether mixed architecture is needed.
- Asked if modular monolith is valid for many users.
- Asked pros/cons of modular monolith.

### 23.4 Documentation and planning cycles
- Asked for PRD + roadmap deliverable and downloadable format.
- Asked to compare current direction with interim report and list improvements/changes.
- Requested PRD/roadmap language tone adjustments (casual/student tone), then asked to redo with more elaboration.
- Asked about rate limits and expected implementation pace.
- Asked to plan work without day-based estimates due long coding sessions.
- Asked repeatedly for "next step" in small chunks.

### 23.5 Frontend UX and component refactor iteration
- Requested collapsible sidebar with theme-consistent button and responsive behavior.
- Requested sidebar clickable collapse plus button support.
- Requested repeated App refactor/component extraction where helpful.
- Requested "next step always included after each done step."
- Requested 3-4 file change cadence during implementation.
- Requested cleanup pass and explanation of shared contracts/barrel exports.
- Asked dumbified explanations for shared contract/API/barrel exports.

### 23.6 Focus feature iteration arc
- Requested implementation of focus timer.
- Requested wheel timer style.
- Requested temporary simplification to focus-only mode (remove short/long break logic for now).
- Requested personalization based on survey and study preference, with room for future expansion.
- Requested slime visible in same focus screen.
- Reported personalization/timer adjustment bugs and asked direct fix.
- Requested always-automatic adaptation based on database behavior (future-state concept), then asked to revert that specific change.
- Requested dedicated focus-session page behavior and strict anti-distraction flow.
- Requested no pause flow and specific copy ("can't pause until timer ends" style).
- Requested in-app warning (no random browser warning dialogs).
- Reported repeated start-session regressions; multiple bug-fix loops were run.

### 23.7 Tasks MVP and backend integration arc
- Requested move to Tasks MVP implementation.
- Reported Docker not running and localhost confusion.
- Reported path typo (`frontent`) and asked correction.
- Asked whether POST calls save locally or actual DB.
- Asked if backend must run with frontend (yes in split mode).
- Asked difference between one-command Docker mode vs split local mode.
- Asked if one command (`npm run dev`) should be enough and how localhost mapping works.
- Reported add-task connection issues and asked if backend is required.

### 23.8 Database/Env troubleshooting arc
- Reported DB host resolve error (`ENOTFOUND db`) when running outside compose.
- Asked to generate `.env`.
- Reported duplicate user email error; requested patch for idempotent test user flow.
- Asked how to verify changes in DB and how to open DB tools.
- Asked for beginner-level explanation of local vs Docker vs DB transition.
- Asked psql and Windows PowerShell command usage repeatedly.
- Reported password auth failures and eventual successful DB init execution.

### 23.9 Deployment training arc (Railway + Vercel)
- Requested full deployment step-by-step guidance with screenshots.
- Asked `/health` meaning and how to test live service quickly.
- Set up Railway backend + Postgres and Vercel frontend with guidance.
- Asked about env var references and DB connection linkage in Railway.
- Asked how to inspect DB entries in hosted Postgres.
- Asked about domains, free-tier limits, auto-redeploy behavior, and deployment pause/cost controls.
- Asked whether to stop deployment and continue dev locally (recommended yes for cost control when inactive).

### 23.10 Security and reliability expectations
- Asked whether high security is required for FYP scope.
- Asked what tokens are and whether they are purchased (clarified: generated in app, no purchase).
- Asked what changes are needed for online deployment security posture.
- Added/kept pragmatic security baseline:
  - JWT auth
  - bcrypt hashing
  - route protection
  - login lockout/audit logs
  - env-based CORS allowlist
  - dev route gating for production.

### 23.11 Workflow and cross-device operation
- Asked how to move between desktop and laptop without environment drift.
- Asked how to avoid committing secret/package artifacts.
- Hook-based guard introduced to block `.env` commits.
- Asked to explain `.env.example -> .env` copy pattern.
- Asked for full cross-device flow including Railway/Vercel env handling.

### 23.12 Focus guard and desktop-app detection exploration
- Requested feature to detect social/media app usage and stop/reset timer if detected.
- Requested popup window mode for focus session.
- Requested theory explanation of focus guard model.
- Requested timer sync between popup and main window plus better failure reason messages.
- Requested deployment viability for desktop-guard behavior.
- Later requested rollback away from this branch before further timer modifications.

### 23.13 Progression/customization/leaderboard expansion arc
- Requested achievements + customization + currency + leaderboard expansion.
- Requested:
  - visible currency section (not separate currency sidebar in later preference),
  - quick XP/dev controls,
  - global + friends leaderboard,
  - working backend integration.
- Requested reversion to feature-by-feature approach when combined change set got noisy.
- Requested backend-fetched leaderboard and working XP/coins/customization persistence.
- Requested store cleanup to image-backed items only.

### 23.14 Asset pipeline and visual system prompts
- Asked if assistant can use provided image files and implement animations.
- Asked for prompt templates to generate one cosmetic asset at a time.
- Requested descriptions (e.g., grad hat, red slime color) and color-context explanation.
- Added images under root `images/` and requested immediate integration.
- Requested slime enlargement, then consistent slime visuals across dashboard/focus/customize.
- Requested face overlay support (eyes + mouth) with future health-expression roadmap.
- Requested dynamic proportional scaling for eyes/pupils/mouth with slime size.
- Requested many calibration passes for offsets/gaps/pupil centering across contexts.

### 23.15 CSS refactor and maintainability prompts
- Asked if `App.css` can be cleaned.
- Requested actual CSS modularization implementation.
- Resulting direction: split into tokens/base/layout + feature-scoped style files.

### 23.16 Current product-priority lock (latest)
- Asked for redeploy roadmap for friend testing.
- Requested XP leveling fix first, then achievements, then leaderboards/analytics.
- Confirmed preference: one feature at a time.
- Latest sequence explicitly confirmed:
  1. Level-up system (non-linear XP cost by level)
  2. Achievements (few, practical)
  3. Analytics (simple display)
  4. Leaderboard (data-backed reliability)

### 23.17 Session-preservation prompts (this final stage)
- Requested prompt that carries context into a new chat.
- Requested project notes to include all context and history details.
- Requested full redo of `PROJECT_NOTES.md` to preserve context-window knowledge before truncation.
- Final instruction: convert all prompts into readable notes in `PROJECT_NOTES.md`.

### 23.18 Feature-order enforcement and implementation sprint
- Re-stated strict execution style:
  - concise/pragmatic responses,
  - one feature at a time,
  - small testable changes,
  - after each step include: what changed, manual test, commit message.
- Requested Achievements MVP first with backend-evaluated persistence and frontend rendering.
- Added scope details:
  - `first_task`
  - `task_10`
  - `level_3`
  - `level_5`
  - `xp_500`
  - `first_unlock`
- Requested dev resets:
  - XP reset
  - achievements reset
  - and ensured dev features can later be fully removed safely.
- Prompted UI placement changes:
  - move achievements to dedicated tab,
  - remove achievements from dashboard,
  - expand to eight achievements.

### 23.19 Analytics and leaderboard expansion prompts
- After achievements, requested analytics implementation.
- Then requested customization/leaderboard consolidation:
  - move `Customize` out of bottom sidebar placement,
  - add reset for customization/earned cosmetics (dev utility),
  - treat customization as completed feature,
  - proceed to leaderboard.
- Leaderboard requirement clarified:
  - global leaderboard active,
  - local/group leaderboard shown but disabled/greyed for now.

### 23.20 Context-window continuity and documentation hardening prompts
- Asked what happens when context window runs out.
- Requested immediate creation of highly detailed `PROJECT_NOTES.md` timeline.
- Requested additional detail depth including GitHub push references.
- Set explicit operating rule:
  - for every future prompt/implementation, append to `PROJECT_NOTES.md`
  - so new chats can recover continuity from file state.

### 23.21 Workflow governance prompts after doc hardening
- Asked for current recommended commit and push message wording.
- Asked for current roadmap state summary.
- Requested security audit of codebase at that point-in-time.
- Prompted cross-device onboarding question:
  - exact steps to open project on another laptop after pulling latest changes.

### 23.22 Cross-laptop bootstrap guidance recorded
- Verification was done against current repo state:
  - root scripts (`setup`, `dev`, `stop`, `clean`),
  - compose ports/services,
  - backend/frontend `.env.example`.
- Operational answer standardized:
  1. install prerequisites (git/node/docker),
  2. clone + checkout/pull branch,
  3. copy env examples to `.env`,
  4. run `npm run setup`,
  5. run `docker compose up --build`,
  6. verify frontend/backend/db ports,
  7. use clean-reset if DB/container drift occurs.

### 23.23 Ongoing note-maintenance instruction (current prompt)
- Current prompt requested extending Section 23 from `23.17` onward in same style and to include all context so far.
- Action taken:
  - appended `23.18` through `23.23`,
  - aligned chronology with the later execution phase,
  - preserved prompt intent + implementation direction for future chat recovery.

This section, together with Sections 5/15/22, is the canonical continuity package for future sessions.



---

## 24) Latest Session Ledger (2026-03-05)

### 24.1 Prompt: implement camera feature first with Python detection library
- Prompt intent:
  - implement camera monitoring before other pending features.
  - use a Python library for behavior detection during focus session.
- Implementation:
  - Added local Python camera-monitor service using `mediapipe` + `opencv-python` + `fastapi`.
  - Service endpoint `POST /analyze` accepts frame data URL and returns one of:
    - `focused`
    - `away`
    - `looking_up`
    - `on_phone` (heuristic)
  - Added frontend focus camera integration:
    - enable/disable camera monitor toggle in Focus session UI
    - webcam capture and periodic frame analysis while session is running
    - status + confidence + reason display
    - warning banner integration when distracting states are detected
  - Added frontend env config for monitor endpoint:
    - `VITE_CAMERA_MONITOR_URL` (default `http://localhost:8001`)
  - Added run docs and requirements for local Python service.
- Files touched:
  - `frontend/.env.example`
  - `frontend/src/shared/config/env.ts`
  - `frontend/src/features/focus/types.ts`
  - `frontend/src/features/focus/api/cameraMonitorApi.ts`
  - `frontend/src/features/focus/api/index.ts`
  - `frontend/src/features/focus/hooks/useFocusCameraMonitor.ts`
  - `frontend/src/features/focus/hooks/index.ts`
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
  - `frontend/src/features/focus/styles.css`
  - `tools/camera-monitor/app.py`
  - `tools/camera-monitor/requirements.txt`
  - `tools/camera-monitor/README.md`
- Validation:
  - `npm --prefix backend run typecheck` passed
  - `npm --prefix frontend run build` passed
  - `python -m py_compile tools/camera-monitor/app.py` passed
- Status: done

### 24.2 Prompt follow-up: make camera feature pull-ready for anyone cloning repo
- Prompt intent:
  - avoid per-user manual Python setup burden after pull.
  - make project run-ready for teammates with minimal commands.
- Implementation:
  - Added `camera-monitor` as a first-class Docker Compose service on port `8001`.
  - Added camera monitor Dockerfile so service builds/runs with `docker compose up --build`.
  - Updated camera monitor README with compose-first instructions.
  - Existing frontend camera monitor env default remains `http://localhost:8001` so browser can call service directly.
- Files touched:
  - `docker-compose.yml`
  - `tools/camera-monitor/Dockerfile`
  - `tools/camera-monitor/README.md`
- Validation:
  - `docker compose config` passed
  - `npm --prefix backend run typecheck` passed
  - `npm --prefix frontend run build` passed
- Status: done

### 24.3 Prompt follow-up: camera imports unresolved (`cv2`, `mediapipe`, `numpy`, `fastapi`, `pydantic`)
- Root cause identified:
  - local machine Python is `3.14.2` with no compatible camera deps installed.
  - camera Docker image was also missing OpenCV runtime shared libs (`libxcb.so.1`).
- Implementation/fix:
  - Updated `tools/camera-monitor/Dockerfile` to install required system libs:
    - `libglib2.0-0`, `libgl1`, `libsm6`, `libxext6`, `libxrender1`, `libxcb1`.
  - Updated camera README to require Python `3.11` for local non-docker runs and to use `python -m pip`.
- Validation:
  - rebuilt and started camera service: `docker compose up -d --build camera-monitor`
  - health check passed: `http://localhost:8001/health` -> `{ "status": "ok" }`
- Status: done

### 24.4 Prompt follow-up: camera still not working (runtime UX/CORS refinement)
- Diagnostics performed:
  - verified all containers running and camera monitor healthy.
  - verified `/analyze` endpoint works with valid data URL payload.
  - identified potential local-origin mismatch (`http://127.0.0.1`) and camera-start timing friction.
- Implementation/fixes:
  - expanded camera monitor CORS allow list and regex to include `localhost` and `127.0.0.1` with optional ports.
  - changed frontend camera monitor hook to start webcam stream immediately when monitor is enabled (not only after timer starts).
  - added focus UI tip to enable camera before session start to avoid permission-prompt interruption with focus lock.
- Validation:
  - rebuilt camera monitor container.
  - CORS preflight verified for:
    - `http://localhost`
    - `http://localhost:5173`
    - `http://127.0.0.1:5173`
    - `http://127.0.0.1`
  - `npm --prefix frontend run build` passed.
  - `python -m py_compile tools/camera-monitor/app.py` passed.
- Status: done

### 24.5 Prompt follow-up: enlarge camera and show points/thought process
- Prompt intent:
  - make camera preview larger in focus UI.
  - expose detector points and decision reasoning.
- Implementation:
  - Extended camera monitor API result to include structured debug payload:
    - `facePoints` (landmark coordinates)
    - `handPoints` (hand-tip coordinates)
    - `metrics` (numeric/boolean signals)
    - `decisionPath` (step-by-step classification logic)
  - Focus frontend now renders:
    - larger camera panel
    - overlay point markers on top of video
    - decision path panel
    - metrics chips
  - Increased analysis frame size from `480x270` to `640x360`.
- Files touched:
  - `tools/camera-monitor/app.py`
  - `frontend/src/features/focus/types.ts`
  - `frontend/src/features/focus/hooks/useFocusCameraMonitor.ts`
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
  - `frontend/src/features/focus/styles.css`
- Validation:
  - `docker compose up -d --build camera-monitor` passed
  - sample `/analyze` response includes debug payload
  - `npm --prefix frontend run build` passed
  - `npm --prefix backend run typecheck` passed
  - `python -m py_compile tools/camera-monitor/app.py` passed
- Status: done

### 24.6 Prompt follow-up: higher camera frequency + ear points + missing-points rule + looking_down focus
- Prompt intent:
  - increase camera update frequency.
  - add more facial points (ears).
  - treat missing key points as not focused.
  - replace `looking_up` with more accurate `looking_down`.
  - remove fingertip-based logic.
- Implementation:
  - Frontend camera analysis interval reduced from `5000ms` to `1500ms`.
  - Detection states updated to `focused | away | looking_down`.
  - Removed hand/fingertip debug and related monitor warning paths.
  - Backend detector now tracks key face points:
    - nose, left_eye, right_eye, left_ear, right_ear, chin.
  - New rule: if any key point goes out-of-frame/missing, classify as `away` (not focused).
  - Added/updated metrics for down-gaze and point visibility (`lookingDown`, `allKeyPointsVisible`, `missingPointCount`, etc.).
  - Decision-path debug now reflects new logic flow.
- Files touched:
  - `tools/camera-monitor/app.py`
  - `tools/camera-monitor/README.md`
  - `frontend/src/features/focus/types.ts`
  - `frontend/src/features/focus/hooks/useFocusCameraMonitor.ts`
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `docker compose up -d --build camera-monitor` passed.
  - sample `/analyze` response shape validated.
  - `npm --prefix frontend run build` passed.
  - `python -m py_compile tools/camera-monitor/app.py` passed.
- Status: done

### 24.7 Prompt follow-up: points should disappear when not found (head turn case)
- Prompt intent:
  - turning head should not keep stale/assumed landmarks.
  - if points are not reliable/not found, they should disappear.
- Implementation:
  - Added stricter head-turn reliability gate in camera service:
    - computes `headYawAbs` and `earBalanceDiff`.
    - when threshold exceeded, classify as `away`.
    - clears `facePoints` in response so overlay points disappear.
  - Added debug metrics:
    - `headTurnedTooFar`, `headYawAbs`, `earBalanceDiff`.
- Files touched:
  - `tools/camera-monitor/app.py`
- Validation:
  - `docker compose up -d --build camera-monitor` passed.
  - `python -m py_compile tools/camera-monitor/app.py` passed.
  - `npm --prefix frontend run build` passed.
- Status: done

### 24.8 Prompt follow-up: keep existing points, only hide missing ones + faster updates
- Prompt intent:
  - do not clear all points when head turns.
  - hide only points considered missing/unreliable.
  - increase update frequency further.
- Implementation:
  - Camera service now computes `raw_face_points` and filters to `visible_face_points` using reliability bounds.
  - Added partial-hide behavior for strong head turns:
    - likely-occluded ear point is removed while remaining reliable points are kept.
  - `missingPointCount` / `allKeyPointsVisible` now derive from filtered-visible set.
  - `away` classification still triggers when key points become unreliable, but overlay keeps whatever points are still reliable.
  - Frontend analysis interval increased from `1500ms` to `900ms`.
- Files touched:
  - `tools/camera-monitor/app.py`
  - `frontend/src/features/focus/hooks/useFocusCameraMonitor.ts`
- Validation:
  - `docker compose up -d --build camera-monitor` passed
  - `python -m py_compile tools/camera-monitor/app.py` passed
  - `npm --prefix frontend run build` passed
- Status: done

### 24.9 Prompt follow-up: minor confidence-score tuning
- Prompt intent:
  - "change confidence scores a tiny bit"
- Implementation:
  - Applied subtle confidence recalibration in camera detector:
    - no-face away: `0.96 -> 0.94`
    - missing/unreliable points away: `0.95 -> 0.92`
    - strong head-turn away: `0.93 -> 0.91`
    - looking-down clamp/tuning: `min/max/slope` slightly softened
    - focused confidence clamp/tuning slightly lowered from previous high bound
- Files touched:
  - `tools/camera-monitor/app.py`
- Validation:
  - `python -m py_compile tools/camera-monitor/app.py` passed
  - `docker compose up -d --build camera-monitor` passed
  - camera monitor health endpoint returned OK
- Status: done

### 24.10 Prompt follow-up: differentiate looking_down vs phone usage
- Prompt intent:
  - distinguish a user who is simply looking down from a user likely using a phone during focus.
  - keep this inside the existing camera monitor flow.
- Implementation:
  - Added a new camera state: `using_phone`.
  - Extended backend analyzer to run MediaPipe Hands in addition to Face Mesh.
  - Kept hand logic lightweight and non-fingertip based:
    - uses hand base landmarks only (`wrist`, `thumb_cmc`, `index_mcp`, `pinky_mcp`).
  - Added phone heuristic metrics:
    - downward gaze detected
    - visible hand base points count
    - hand points below eye-line
    - hand points near chin (distance threshold normalized by face size)
    - `phoneSignalScore`
  - Classification rule for `using_phone`:
    - must be looking down
    - at least 2 reliable hand-base points visible
    - at least 2 below eyes
    - at least 2 near chin
  - If rule is not met and down-gaze is present, state remains `looking_down`.
  - Frontend typings updated to include `using_phone`.
  - Frontend warning message added for `using_phone`.
  - Camera monitor README updated with new state definition.
- Files touched:
  - `tools/camera-monitor/app.py`
  - `tools/camera-monitor/README.md`
  - `frontend/src/features/focus/types.ts`
  - `frontend/src/features/focus/hooks/useFocusCameraMonitor.ts`
- Validation planned:
  - `python -m py_compile tools/camera-monitor/app.py`
  - `npm --prefix frontend run build`
- Status: done

### 24.11 Prompt follow-up: make `using_phone` trigger on close finger pair
- Prompt intent:
  - user reported `using_phone` was not triggering reliably.
  - requested rule: if any 2 fingers are in proximity, assume phone usage.
- Implementation:
  - Reintroduced fingertip landmarks in detector (`thumb_tip`, `index_tip`, `middle_tip`, `ring_tip`, `pinky_tip` per hand).
  - Added fingertip proximity metrics:
    - `visibleFingerTipCount`
    - `closestFingerDistance`
    - `fingerProximityThreshold`
    - `closeFingerPairCount`
  - Added direct MVP trigger:
    - `using_phone` is true when at least one reliable fingertip pair is within proximity threshold.
  - Kept previous fallback trigger:
    - down gaze + hand-base cluster near chin.
  - Updated decision path text to show when finger-proximity rule was used.
  - Updated camera-monitor README state description to match new heuristic.
- Files touched:
  - `tools/camera-monitor/app.py`
  - `tools/camera-monitor/README.md`
- Validation planned:
  - `python -m py_compile tools/camera-monitor/app.py`
  - `npm --prefix frontend run build`
- Status: done

### 24.12 Prompt follow-up: responsive pass + phone dropdown navbar
- Prompt intent:
  - run a responsive check and ensure tablet/phone UX makes sense.
  - replace phone sidebar rail with a dropdown navbar pattern.
- Implementation:
  - Updated `AppSidebar` to render a phone-only top navigation variant when `isPhoneScreen` is true:
    - brand row (`MySlime`)
    - dropdown toggle showing active tab name
    - dropdown menu containing the full tab list
    - compact user chip in dropdown
  - Added mobile behavior controls:
    - auto-close dropdown after tab selection
    - close dropdown on outside click
    - reset dropdown closed when returning to desktop width
  - Reworked phone responsive CSS:
    - `.app` switches to column layout on phone
    - sidebar becomes sticky top mobile bar
    - dropdown menu styling for readable touch targets
    - main content width/padding tuned for small screens
    - extra compact spacing at `<=480px`
- Files touched:
  - `frontend/src/app/components/AppSidebar.tsx`
  - `frontend/src/app/App.css`
- Validation planned:
  - `npm --prefix frontend run build`
- Status: done

### 24.13 Prompt follow-up: remove notification/sync buttons + longer mobile dashboard button
- Prompt intent:
  - permanently remove notification and sync controls from header.
  - make dashboard button longer on phone.
- Implementation:
  - Simplified `AppHeader` actions to keep only `Logout`.
  - Removed `onRefresh` and `loading` props from `AppHeader` contract and updated `App.tsx` call site.
  - Added tab-specific nav class in `SidebarNav` (`nav-item-${tab.id}`) for targeted responsive styling.
  - Updated mobile dropdown toggle class in `AppSidebar`:
    - adds `dashboard-active` when current tab is `dashboard`.
  - Updated phone CSS:
    - `.mobile-nav-toggle.dashboard-active` now has wider min/max width.
    - `.nav-item-dashboard` gets larger touch target on mobile dropdown.
- Files touched:
  - `frontend/src/app/components/AppHeader.tsx`
  - `frontend/src/app/App.tsx`
  - `frontend/src/features/slime/components/SidebarNav.tsx`
  - `frontend/src/app/components/AppSidebar.tsx`
  - `frontend/src/app/App.css`
- Validation planned:
  - `npm --prefix frontend run build`
- Status: done

### 24.14 Prompt follow-up: tighten phone detection and lower focused confidence
- Prompt intent:
  - lower confidence score for `focused`.
  - avoid `using_phone` triggering from only 2 fingers; require stronger signal with looking down.
- Implementation:
  - Updated `using_phone` fingertip rule in camera detector:
    - now requires `looking_down`
    - requires at least `3` reliable visible fingertips
    - requires at least one close fingertip pair.
  - Kept existing fallback rule (`looking_down` + hand-base cluster near chin).
  - Lowered focused confidence calibration:
    - from `max(0.58, min(0.95, 0.88 - center_offset))`
    - to `max(0.52, min(0.88, 0.8 - center_offset))`
  - Updated camera monitor README heuristic description.
- Files touched:
  - `tools/camera-monitor/app.py`
  - `tools/camera-monitor/README.md`
- Validation planned:
  - `python -m py_compile tools/camera-monitor/app.py`
- Status: done

### 24.15 Prompt follow-up: focus session start sequence + mode selection
- Prompt intent:
  - enforce a sequence before session start.
  - offer mode choice:
    - `Regular Study`
    - `Intense Mode` (camera-enabled flow).
- Implementation:
  - Added focus mode state to `FocusTimerCard`:
    - `regular | intense | null`
  - Added start sequence UI card:
    - Step 1: choose mode
    - Step 2 (intense only): enable camera
    - Ready state indicator
  - Start button now requires sequence completion:
    - blocked until mode is selected
    - for intense mode, blocked until camera is enabled
    - start label updates for intense mode (`Start Intense Session`)
  - Intense-mode behavior:
    - camera panel shown only in intense mode
    - quick CTA to enable camera for intense mode
  - Regular-mode behavior:
    - selecting regular auto-disables camera
    - session starts without camera requirement
  - Added supporting focus CSS styles for sequence card, mode buttons, and disabled start state.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
  - `frontend/src/features/focus/styles.css`
- Validation planned:
  - `npm --prefix frontend run build`
- Status: done

### 24.16 Prompt follow-up: start-session popup sequence + camera tag cleanup + 10s warning bubble
- Prompt intent:
  - change sequence to:
    - click `Start Session`
    - popup/modal appears
    - choose `Intense` or `Regular`
    - then start timer.
  - remove camera tags/visual clutter.
  - add warning bubble when user is not focused with 10-second grace before ending session.
- Implementation:
  - Refactored focus start flow in `FocusTimerCard`:
    - Start button now opens a modal sequence (not immediate start).
    - Modal handles mode selection and timer start confirmation.
    - Mode is reset to unselected each time modal opens (forces explicit choice per session).
  - Intense-mode gating:
    - in modal, Intense requires camera enabled before start button is allowed.
    - includes quick `Enable Camera` button.
  - Added camera unfocused grace logic (intense + running only):
    - if camera state is `away`, `looking_down`, or `using_phone`, starts 10s countdown.
    - shows warning bubble: "Return to study or session will end in Xs."
    - if countdown reaches 0, session is discarded via interruption handler.
    - countdown clears immediately once focused state returns.
  - Camera UI cleanup:
    - removed overlay text labels for points.
    - removed decision-path and metrics tag blocks from camera panel.
  - Added modal/warning-bubble styles and responsive modal button layout in focus CSS.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
  - `frontend/src/features/focus/styles.css`
- Validation planned:
  - `npm --prefix frontend run build`
- Status: done

### 24.17 Prompt follow-up: countdown interruption bug + camera panel persistence
- Prompt intent:
  - fix bug where 10-second unfocused countdown is interrupted/reset while still unfocused.
  - remove remaining face/hand tags on camera.
  - ensure camera panel does not disappear after an interrupted session.
- Root cause:
  - countdown logic depended on transient camera monitor state updates; monitor flips to `analyzing` between detections, which could cancel/reset countdown.
- Implementation:
  - Updated countdown logic in `FocusTimerCard` to rely on stable detector result state (`cameraLastResult.state`) instead of transient monitor status.
  - Removed remaining landmark tooltip tag (`title`) from camera point elements.
  - Made camera panel visibility resilient:
    - now shown when either:
      - selected mode is intense, or
      - camera is currently enabled.
    - avoids visual disappearance after interruption when camera remains enabled.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.18 Prompt follow-up: auto-disable camera on stop + session popup + remove camera circles
- Prompt intent:
  - automatically disable camera when session ends or is interrupted.
  - keep timer/camera monitor in a separate popup-like window during active session.
  - remove green camera circles/tags.
- Implementation:
  - Added running-transition logic in `FocusTimerCard`:
    - when state transitions from running -> stopped, camera auto-disables.
    - applies to completed and interrupted sessions.
  - Removed landmark point overlay rendering from camera preview (no circles/tags shown).
  - Added active-session popup mode:
    - while running, a fixed overlay/backdrop is rendered.
    - focus card becomes a centered popup window with scroll if needed.
    - non-essential sections are hidden in popup mode (survey/personalization/footer notes).
  - Added responsive popup sizing for phone widths.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
  - `frontend/src/features/focus/styles.css`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.19 Prompt follow-up: finalize no-dot camera UI + confirm popup window behavior
- Prompt intent:
  - ensure green/orange camera dots are fully removed.
  - ensure running focus session is in separate popup/window style.
- Implementation:
  - Confirmed point overlay render path is removed from `FocusTimerCard`.
  - Removed leftover `.focus-camera-overlay` CSS block from focus styles.
  - Retained running-session popup mode (`session-popup-mode` + backdrop) as active-session window behavior.
- Files touched:
  - `frontend/src/features/focus/styles.css`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.20 Prompt follow-up: dashboard task stats from real data + remove system status panel
- Prompt intent:
  - on dashboard, task numbers should reflect actual completed tasks.
  - remove System Status section from dashboard.
- Implementation:
  - Updated dashboard task stat pipeline in `App.tsx`:
    - fetches real tasks from backend using `getTasks(token)` when dashboard tab is active.
    - computes:
      - `completedTasks` (all-time completed task count)
      - `completedToday` (completed tasks for current local day)
      - fixed `dailyGoal` (5)
    - passes computed stats into `QuickStats`.
  - Updated `QuickStats` to render real task metrics:
    - header now shows `completedToday/dailyGoal today`
    - main value now shows `completedTasks`
    - added daily-goal progress bar + text percentage based on real completions.
  - Removed dashboard `SystemStatus` section render and import from `App.tsx`.
- Files touched:
  - `frontend/src/app/App.tsx`
  - `frontend/src/features/slime/components/QuickStats.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.21 Prompt follow-up: keep camera monitor only in running popup session
- Prompt intent:
  - remove camera monitor from normal focus screen after session.
  - keep camera monitor only inside active popup session.
- Implementation:
  - Updated camera panel visibility logic in `FocusTimerCard`:
    - from mode/camera-enabled based visibility
    - to strict running-session visibility:
      - `showCameraPanel = isRunning && selectedMode === 'intense'`
  - Result:
    - camera panel no longer appears before session start or after session end/interruption.
    - camera monitor remains visible only while active intense session popup is running.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.22 Prompt follow-up: revert previous camera-visibility restriction
- Prompt intent:
  - revert the previous change from 24.21.
- Implementation:
  - Restored prior camera panel visibility logic in `FocusTimerCard`:
    - `showCameraPanel = selectedMode === 'intense' || isCameraEnabled`
  - This returns behavior from before 24.21.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation planned:
  - `npm --prefix frontend run build`
- Status: done

### 24.23 Prompt follow-up: away-state interrupt grace period
- Prompt intent:
  - interruption should not trigger immediately on initial `away` detection.
  - require `away` to persist for more than 3 seconds first.
- Implementation:
  - Added `AWAY_GRACE_PERIOD_MS = 3000` to focus camera interruption flow.
  - Added `awayDetectedAtMsRef` tracking in `FocusTimerCard`.
  - Countdown/interrupt now behaves as:
    - if state is `away`, it must remain continuously `away` for >=3 seconds before countdown starts.
    - if state returns to non-away before 3 seconds, timer is reset and no interruption countdown starts.
    - other unfocused states (`looking_down`, `using_phone`) keep existing behavior.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.24 Prompt follow-up: fix missing warning after away grace
- Prompt intent:
  - warning message/countdown was not appearing reliably after the 3-second away rule.
- Root cause:
  - detector can briefly flicker away/non-away, resetting away timer too aggressively.
- Implementation:
  - Added away flicker tolerance (`AWAY_FLICKER_TOLERANCE_MS = 1200`) in `FocusTimerCard`.
  - Added `awayLastSeenAtMsRef` to preserve away continuity across short classifier blips.
  - Away flow now:
    - requires >=3 seconds away before countdown starts,
    - tolerates short away-state interruptions so warning/countdown still appears reliably.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.25 Prompt follow-up: warning still not showing (effective away-state fix)
- Prompt intent:
  - warning still failed to appear after prior fix.
- Root cause:
  - logic still cleared countdown path when a brief non-away sample occurred before warning started.
- Implementation:
  - Reworked away gating in `FocusTimerCard` to use `effective away` state:
    - `isAwayEffective = currentState === away OR within away flicker tolerance`.
  - Reworked unfocused boolean:
    - `isUnfocused = isAwayEffective OR state in {looking_down, using_phone}`.
  - 3-second away grace now applies to `isAwayEffective` (not only exact away samples), preventing premature resets.
  - Removed now-unused `UNFOCUSED_CAMERA_STATES` constant.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.26 Prompt follow-up: warning still missing (state fallback + wider tolerance)
- Prompt intent:
  - warning still did not show after prior effective-away fix.
- Implementation:
  - Added fallback detection source in `FocusTimerCard`:
    - `effectiveCameraDetectionState` now uses `cameraLastResult.state` first,
    - falls back to `cameraState` when it is one of `away | looking_down | using_phone`.
  - Increased away flicker tolerance:
    - `AWAY_FLICKER_TOLERANCE_MS` from `1200` to `4000`.
  - Updated away/unfocused derivation to use `effectiveCameraDetectionState` consistently.
- Rationale:
  - prevents warning suppression when backend result momentarily lags/clears while hook state already reflects unfocused condition.
  - tolerates wider detector jitter so 3s-away gate can complete and bubble can render.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.27 Prompt follow-up: explicit away-duration tracker (3s gate -> 10s countdown)
- Prompt intent:
  - implement explicit flag/timer tracking away duration from session start.
  - once away exceeds 3 seconds, begin 10-second countdown.
- Implementation:
  - Replaced prior away-trigger path with explicit away-time tracking loop in `FocusTimerCard`:
    - added `awayStartedAtMsRef` and `awayTrackerIntervalRef`.
    - added tracker interval (`AWAY_TRACK_INTERVAL_MS = 200`) active only during running intense sessions.
  - New logic:
    - if detection is `away`, tracker accumulates elapsed away time.
    - if away duration reaches `AWAY_GRACE_PERIOD_MS` (3000), starts 10-second countdown (`AWAY_COUNTDOWN_MS`).
    - if detection returns non-away, away timer resets and countdown clears.
  - Added `effectiveCameraDetectionStateRef` to make tracker read latest detection state continuously.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.28 Prompt follow-up: include `looking_down` in 3s grace tracking
- Prompt intent:
  - extend working away-duration logic so `looking_down` is included too.
- Implementation:
  - Added `GRACE_TRACKED_STATES = { away, looking_down }` in `FocusTimerCard`.
  - Updated grace tracker loop to treat either state as tracked-unfocused:
    - if `away` or `looking_down` persists >=3s, start 10s countdown.
    - when state exits tracked-unfocused set, grace timer and countdown clear.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.29 Prompt follow-up: revert `looking_down` inclusion; use `using_phone` instead
- Prompt intent:
  - user clarified: do not include `looking_down` in grace-tracked interruption.
  - include `using_phone` instead.
- Implementation:
  - Updated grace-tracked camera states in `FocusTimerCard`:
    - from `{ away, looking_down }`
    - to `{ away, using_phone }`
  - Result:
    - 3s grace + 10s countdown now applies to `away` and `using_phone`.
    - `looking_down` no longer participates in this grace-tracked interruption flow.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation planned:
  - `npm --prefix frontend run build`
- Status: done

### 24.30 Prompt follow-up: hide camera monitor unless session is running
- Prompt intent:
  - after session, camera monitor section should disappear.
  - show camera monitor only while session has started/running.
- Implementation:
  - Updated `showCameraPanel` in `FocusTimerCard`:
    - from mode/camera-enabled visibility
    - to running-intense visibility only:
      - `showCameraPanel = isRunning && selectedMode === 'intense'`
  - Result:
    - no camera monitor section on idle focus page.
    - camera monitor appears only during active intense session popup.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.31 Prompt follow-up: camera appears not working in start modal (no pre-start visual feedback)
- Prompt intent:
  - user selected intense mode and enabled camera in modal, but had no visible confirmation, making camera seem broken.
- Root cause:
  - camera panel is intentionally hidden until session runs, so pre-start camera enable had no visible preview.
- Implementation:
  - Kept previous rule: full camera monitor section remains hidden on idle focus page.
  - Added camera preview block inside Start Session modal (intense mode path):
    - shows live preview when camera enabled,
    - shows helper note when camera is not enabled,
    - shows camera error message in modal if permission/device fails.
  - Added modal preview styles.
- Files touched:
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
  - `frontend/src/features/focus/styles.css`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.32 Prompt follow-up: camera visible in modal but not after session starts
- Prompt intent:
  - camera preview works in start modal, but disappears once intense session starts.
- Root cause:
  - stream can remain attached to modal video element and not auto-rebind when running-session video element mounts.
- Implementation:
  - Updated `useFocusCameraMonitor` with stream rebind effect:
    - on each render, if camera is enabled and stream exists, ensure current `videoRef` gets the active stream.
    - retries `video.play()` safely, ignoring transient view-transition play errors.
  - This keeps preview alive across modal -> running popup transition.
- Files touched:
  - `frontend/src/features/focus/hooks/useFocusCameraMonitor.ts`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.33 Prompt follow-up: remove analytics/leaderboard refresh + centralize dev tools panel + focus `+1 minute`
- Prompt intent:
  - remove refresh buttons from Analytics and Leaderboard tabs.
  - replace Dashboard recent activity panel with a removable, localhost-only Developer Panel.
  - move dev actions into that panel:
    - Reset XP
    - +100 XP
    - Reset Achievements
    - Reset Tasks
    - Reset Coins
    - +100 Coins
  - add a focus-session dev button for `+1 minute`.
- Implementation:
  - Backend dev reset endpoints completed and wired:
    - `POST /api/tasks/dev-reset`
    - `POST /api/customization/wallet/dev-reset`
  - Frontend API layer completed:
    - exported `resetTasksDev` in tasks API barrel
    - hardened `resetCoinsDev` response typing and missing-data guard
  - Dashboard wiring in `App.tsx`:
    - replaced right dashboard panel with `DevPanel` on localhost
    - keeps `ActivityFeed` for non-localhost
    - removed old inline dev buttons from companion card path
    - added centralized dev action runner + notice/error/loading state
    - refreshes slime/customization/dashboard-task stats after each dev action
  - Analytics/Leaderboard:
    - removed top-right Refresh buttons and unused hook variables
  - Focus:
    - added `addMinuteDev` in timer hook (extends duration and remaining time by 60s)
    - exposed `+1 Minute (Dev)` button in `FocusTimerCard` during running sessions only
    - gated by `isDevToolsEnabled` (passed from App localhost check)
  - Styling:
    - added `dev-panel` grid/note styles in app CSS
    - added focus dev button sizing style
- Files touched:
  - `backend/src/controllers/taskController.ts`
  - `backend/src/routes/taskRoutes.ts`
  - `backend/src/services/customizationService.ts`
  - `backend/src/controllers/customizationController.ts`
  - `backend/src/routes/customizationRoutes.ts`
  - `frontend/src/app/App.tsx`
  - `frontend/src/app/App.css`
  - `frontend/src/features/slime/components/DevPanel.tsx`
  - `frontend/src/features/slime/components/index.ts`
  - `frontend/src/features/analytics/components/AnalyticsBoard.tsx`
  - `frontend/src/features/leaderboard/components/LeaderboardBoard.tsx`
  - `frontend/src/features/focus/hooks/useFocusTimer.ts`
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
  - `frontend/src/features/focus/styles.css`
  - `frontend/src/features/tasks/api/index.ts`
  - `frontend/src/features/tasks/api/tasksApi.ts`
  - `frontend/src/features/customization/api/customizationApi.ts`
  - `frontend/src/features/customization/components/CustomizationWorkspace.tsx`
  - `frontend/src/features/slime/components/SlimeCompanionCard.tsx`
- Validation:
  - `npm --prefix backend run typecheck` passed
  - `npm --prefix frontend run build` passed
- Status: done

### 24.34 Prompt follow-up: clarify focus dev button should mean `+1 minute completed`
- Prompt intent:
  - user clarified that focus dev action should complete one minute (fast-forward progress), not add one minute remaining.
- Implementation:
  - Updated focus timer dev mutation behavior:
    - from extending timer by +60s
    - to completing/consuming 60s from remaining time
  - On crossing zero, session completes immediately using existing completion path:
    - increments completed session count
    - updates total focused minutes
    - triggers completion callback
  - Updated focus dev button label to avoid ambiguity:
    - `+1 Min Completed (Dev)`
- Files touched:
  - `frontend/src/features/focus/hooks/useFocusTimer.ts`
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done

### 24.35 Incremental SoC refactor: extract dashboard task stats out of `App.tsx`
- Prompt intent:
  - improve separation of concerns incrementally without destabilizing auth/security testing work.
- Implementation:
  - Added `useDashboardTaskStats` hook to own dashboard task stat loading and date-based completion aggregation.
  - Updated `App.tsx` to consume the hook and removed direct task API calls/business aggregation logic from app shell.
  - Exported the hook through tasks hooks index.
- Files touched:
  - `frontend/src/features/tasks/hooks/useDashboardTaskStats.ts`
  - `frontend/src/features/tasks/hooks/index.ts`
  - `frontend/src/app/App.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Git:
  - committed and pushed to `main` as `aca21ce` (`refactor(frontend): extract dashboard task stats hook`)
- Status: done

### 24.36 Incremental SoC refactor: extract focus backend sync from `FocusTimerCard`
- Prompt intent:
  - continue incremental cleanup by removing direct focus API sync responsibilities from UI component.
- Implementation:
  - Added `useFocusSessionSync` hook to encapsulate:
    - completed-session backend sync (`completeFocusSession`)
    - focus profile sync (`updateFocusProfile`)
    - warning propagation on sync failures.
  - Updated `FocusTimerCard` to call hook-provided `syncCompletedSession` and removed direct focus API imports/sync effect from component.
  - Exported hook via focus hooks index.
- Files touched:
  - `frontend/src/features/focus/hooks/useFocusSessionSync.ts`
  - `frontend/src/features/focus/hooks/index.ts`
  - `frontend/src/features/focus/components/FocusTimerCard.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done (local changes currently present)

### 24.37 Incremental SoC refactor: move `StudyHealthDevPanel` API actions behind hook boundary
- Prompt intent:
  - continue incremental separation-of-concerns cleanup while preserving behavior and low regression risk.
- Implementation:
  - Added `useStudyHealthDevActions` hook to encapsulate dev action backend calls:
    - day settlement simulation
    - reset XP + reset focus progress + rehydrate settlement snapshot.
  - Updated `StudyHealthDevPanel` to call hook methods and removed direct API-function imports from the component.
  - Exported hook from slime hooks index.
- Files touched:
  - `frontend/src/features/slime/hooks/useStudyHealthDevActions.ts`
  - `frontend/src/features/slime/hooks/index.ts`
  - `frontend/src/features/slime/components/StudyHealthDevPanel.tsx`
- Validation:
  - `npm --prefix frontend run build` passed
- Status: done (local changes currently present)
