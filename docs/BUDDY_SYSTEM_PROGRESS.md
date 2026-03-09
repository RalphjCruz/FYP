# Focus Buddy System Progress Snapshot

Date: 2026-03-09

## Implemented (now archived)

### Backend
- Added buddy room domain/service with 2-user room lifecycle (`waiting`, `active`, `completed`, `cancelled`).
- Added REST endpoints for:
  - `GET /api/focus-buddy/mine`
  - `GET /api/focus-buddy/:code`
  - `POST /api/focus-buddy/create`
  - `POST /api/focus-buddy/join`
  - `POST /api/focus-buddy/:code/start`
  - `POST /api/focus-buddy/:code/leave`
- Added DB schema/index support for `focus_buddy_sessions`.
- Added SQL-side server-authoritative remaining time calculation (`remaining_seconds`).
- Added SSE event pipeline using Postgres `LISTEN/NOTIFY` for buddy updates.

### Frontend
- Added buddy API client and React hook for create/join/start/leave/refresh room actions.
- Added buddy panel in focus screen (create room, join by code, start together, leave room).
- Added buddy status display and active-time badge.
- Added dual-slime buddy preview (You on left, Buddy on right per user perspective).
- Added server-time resync hook integration to align countdown to backend.
- Added SSE stream consumer with fallback polling strategy.

### Sync/Performance Work
- Shifted from fast polling to SSE push + slow fallback polling.
- Added reconnect handling and stream heartbeat behavior.
- Added fallback health-check polling cadence for reliability.

## Known Notes
- Multi-window local testing on same machine can trigger focus/visibility lock behavior.
- Buddy testing requires separate user sessions (different browser profile/incognito/origin).

## Decision
Buddy feature is being rolled back from active code for now.
This file preserves progress and architecture decisions for future re-introduction.
