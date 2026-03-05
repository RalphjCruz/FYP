# Camera Monitor Service (MVP)

This local Python service analyzes webcam frames for focus-state signals:
- `focused`
- `away`
- `looking_down`
- `using_phone` (MVP heuristic: close fingertip pair, or down gaze + hand-base points near chin)

## Run locally

Python version requirement:
- Use Python `3.11` (MediaPipe/OpenCV support is not reliable on Python `3.14` yet).

```powershell
cd tools/camera-monitor
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
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
