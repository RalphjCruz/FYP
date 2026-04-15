# MySlime Deploy Checklist

## 1. Prerequisites
- Backend and frontend dependencies installed.
- Database instance is reachable.
- CI checks are green.

## 2. Required Environment Variables

### Backend
- `NODE_ENV=production`
- `PORT` (example: `3000`)
- `DATABASE_URL` (managed Postgres URL)
- `JWT_SECRET` (strong secret, 32+ chars, no placeholder text)
- `JWT_EXPIRES_IN` (example: `2h`)
- `CORS_ORIGIN` (comma-separated frontend origins)
  - Example: `https://myslime.app,https://www.myslime.app`

### Frontend
- `VITE_API_URL` (public backend URL)
  - Example: `https://api.myslime.app`
- `VITE_CAMERA_MONITOR_URL` (public camera-monitor HTTPS URL, if Intense Mode is enabled for testers)
  - Example: `https://camera.myslime.app`
- `VITE_ENABLE_DEV_PANEL=false`

### Camera Monitor (optional but required for Intense Mode in public testing)
- Deploy `tools/camera-monitor` as a separate HTTPS service.
- Set:
  - `CAMERA_MONITOR_CORS_ORIGINS` (comma-separated allowed frontend origins)
    - Example: `https://myslime.app,https://www.myslime.app`
  - Optional: `CAMERA_MONITOR_CORS_ORIGIN_REGEX` only when wildcard origin matching is intentionally needed.

## 3. Release Verification Command (Local/CI)
From project root:

```bash
npm run check:release
```

This runs:
- Backend typecheck
- Backend tests
- Frontend lint
- Frontend build

## 4. Production Safety Expectations
- `POST /api/slime/test-user` must be blocked in production (returns `404`).
- CORS only allows configured `CORS_ORIGIN` values.
- App should fail startup in production if:
  - `CORS_ORIGIN` is empty
  - `JWT_SECRET` is weak or placeholder-like

## 5. Deployment Steps
1. Apply backend env vars.
2. Apply frontend env vars.
3. Deploy backend service.
4. Deploy frontend service.
5. Ensure DB schema/init/migrations are applied.

## 6. Post-Deploy Smoke Tests
1. `GET /health` returns `200`.
2. Register a new user.
3. Login and verify session (`/api/auth/me`).
4. Dashboard loads slime via `/api/slime/me`.
5. Task CRUD works (`create`, `edit`, `complete`, `delete`).
6. Failed login lockout behavior works and returns `minutesRemaining`.
7. Confirm auth audit logs are written.
8. If Intense Mode is enabled, camera monitor `GET /health` returns `200` over HTTPS and focus camera flow works without CORS errors.

## 7. Rollback Readiness
- Keep previous stable release version available.
- Keep a DB backup/restore point before schema updates.
- Revert frontend to previous build if auth flow fails in production.
