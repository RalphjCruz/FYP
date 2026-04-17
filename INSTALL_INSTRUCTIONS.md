# FYP Instructions

## 1) What To Install

Required:

- Docker Desktop (includes Docker Engine + Docker Compose)
  - Download: https://www.docker.com/products/docker-desktop/
  - After install, open Docker Desktop once and make sure it says Docker is running.

Optional:

- Git (only needed if cloning from GitHub instead of using a ZIP)
  - Download: https://git-scm.com/downloads

You do not need local Node.js, Python, or PostgreSQL for the Docker workflow.

## 2) Receive The Project

If using ZIP:

1. Download/extract the `FYP` folder.
2. Open a terminal in the extracted `FYP` root (the folder containing `docker-compose.yml`).

If using Git:

```bash
git clone https://github.com/RalphjCruz/FYP.git
cd FYP
```

## 3) Run The Full App

From the project root:

```bash
docker compose up --build
```

First run can take several minutes because images are built.

## 4) Open The Services

- Frontend app: `http://localhost`
- Backend API health: `http://localhost:3000/health`
- Camera monitor health: `http://localhost:8001/health`
- pgAdmin: `http://localhost:5050`
  - Email: `admin@myslime.com`
  - Password: `admin`

Postgres is mapped to host port `5433`.

## 5) Daily Commands

Stop containers:

```bash
docker compose down
```

Stop and remove DB volume (full reset):

```bash
docker compose down -v
```

Run detached (background):

```bash
docker compose up --build -d
```

View logs:

```bash
docker compose logs -f
```

## 6) If You Want To Share As ZIP (Recommended Method)

Best practice before zipping:

1. Make sure containers are stopped: `docker compose down`
2. Remove local dependency/build folders to reduce ZIP size:
   - root `node_modules`
   - `backend/node_modules`
   - `frontend/node_modules`
   - `backend/coverage`
   - `frontend/dist`
3. Zip the whole `FYP` folder.

The recipient can then run:

```bash
docker compose up --build
```

## 7) Troubleshooting

- If port `80`, `3000`, `5433`, `5050`, or `8001` is already used, stop the conflicting app/service or change port mappings in `docker-compose.yml`.
- If Docker says virtualization is unavailable, enable virtualization in BIOS/UEFI and restart.
- If builds fail after dependency changes, run:

```bash
docker compose down
docker compose build --no-cache
docker compose up
```

