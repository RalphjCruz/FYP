# Camera Monitor Service (MVP)

This local Python service analyzes webcam frames for focus-state signals:
- `focused`
- `away`
- `looking_down`
- `using_phone` (MVP heuristic: looking_down + at least 3 fingertips with a close pair, or down gaze + hand-base points near chin)

## CORS configuration

This service now reads CORS from environment variables:

- `CAMERA_MONITOR_CORS_ORIGINS` (comma-separated exact origins)
  - Example:
    - `https://myslime.vercel.app,https://www.myslime.ie`
- `CAMERA_MONITOR_CORS_ORIGIN_REGEX` (optional regex if you need wildcard patterns)
  - Keep empty unless you explicitly need it.

If `CAMERA_MONITOR_CORS_ORIGINS` is not set, localhost defaults are used for local development.

## Run locally

Python version requirement:
- Use Python `3.11` (MediaPipe/OpenCV support is not reliable on Python `3.14` yet).

```powershell
cd tools/camera-monitor
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

Frontend default endpoint:
- `http://localhost:8001`

Override via:
- `VITE_CAMERA_MONITOR_URL` in `frontend/.env`

## Run with Docker Compose (recommended for team pull-to-run)

From repo root:

```powershell
docker compose up --build
```

Then verify:
- Camera monitor health: `http://localhost:8001/health`

## Deploy over HTTPS (for external testers)

Recommended: deploy this service separately on Railway or Render (both terminate TLS and expose HTTPS URL).

1. Create a new service from `tools/camera-monitor`.
2. Set environment variables:
   - `PORT` (platform usually injects this automatically)
   - `CAMERA_MONITOR_CORS_ORIGINS=https://<your-frontend-domain>`
   - Optional: `CAMERA_MONITOR_CORS_ORIGIN_REGEX` (only if needed)
3. Deploy and copy the service URL, e.g. `https://myslime-camera-monitor.up.railway.app`.
4. In frontend hosting (Vercel), set:
   - `VITE_CAMERA_MONITOR_URL=https://myslime-camera-monitor.up.railway.app`
5. Redeploy frontend.
6. Verify from browser:
   - `GET https://.../health` returns OK
   - Intense Mode camera flow works without CORS errors.
