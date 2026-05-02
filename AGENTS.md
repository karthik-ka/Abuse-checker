# AGENTS.md — FDCAbuse

## Project Overview
Abuse Operations Console (v2.0) — a Windows 95-themed internal tool for FDCServers abuse team. Single-page React app (no build step) + Node.js Express backend for URL checking.

## Architecture
- **`backend/`** — Express server (`server.js`). Port `3002` (set via `process.env.PORT`, default 3002). Dockerfile `EXPOSE 3001` is stale; the actual listen port is 3002.
- **`frontend/`** — Static `index.html` with React 18 + Babel standalone loaded from CDN. No npm, no build step. Served by nginx.
- **`docker-compose.yml`** — Runs both services on an internal bridge network. Frontend exposed on host port `8080:80`. Backend is NOT exposed to host — only reachable via nginx proxy at `/api/`.
- **`frontend/nginx.conf`** — Proxies `/api/` to `http://backend:3002` (uses Docker Compose service name `backend`).

## Developer Commands
```bash
# Run everything
docker compose up --build

# Run backend standalone (for dev)
cd backend && npm install && node server.js

# Frontend: no local dev server needed — open index.html in a browser or serve with any static server
```

## Key Facts
- **No test framework, linter, typechecker, or CI** — this is a small self-contained app. Verify changes manually via the running app.
- **Backend has no `node_modules` in repo** — `npm install` runs inside the Dockerfile (`--production` only).
- **Frontend has zero build tooling** — React, ReactDOM, and Babel are CDN-loaded. Just edit `index.html`.
- **All state (evidence log) persists in `localStorage`** under key `abuse_evidence`.
- **Defanged URL support** — input normalizes `hxxp://`, `hxxps://`, `[.]`, `(.)`, `[:]` patterns automatically.
- **URL check timeout** — 12 seconds per URL, sequential checks with 500ms delay between each.
- **Body read cap** — only first 64KB of response body used for keyword matching.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/check-url` | Body: `{ url: string }`. Returns `{ statusCode, removed, reason, finalUrl?, error? }` |
| GET | `/api/health` | Returns `{ status: 'ok', ts }` |

## Frontend Tools (tabs in index.html)
URL Checker → Header Analyzer → IP Recon → PTR/RDNS → Subnet Calc → Net Config Gen → Port Scan Gen → ACL Builder → Template Gen → Evidence Log

Each tool generates commands or analysis output; most have "COPY ALL" and "+ LOG" buttons that write to the shared evidence log.
