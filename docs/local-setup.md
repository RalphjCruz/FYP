# Local Setup (New Laptop)

## 1. Install prerequisites
- Git
- Docker Desktop
- Node.js (LTS) + npm

## 2. Clone and install
```bash
git clone <your-repo-url>
cd FYP
npm run setup
```

## 3. Create env files
```bash
copy backend\\.env.example backend\\.env
copy frontend\\.env.example frontend\\.env
```

## 4. Start local stack
```bash
npm run dev
```

Notes:
- DB schema auto-initializes from `db/init.sql` on first DB startup.
- If you need a fresh DB, run `npm run clean` then `npm run dev`.

## Efficient rebuild workflow
- Normal dev: `npm run dev`
- Rebuild only when Dockerfiles/dependencies changed: `docker compose up --build`
- Use `--no-cache` only when build cache is suspected broken.
