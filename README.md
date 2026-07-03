# BEKEM Frontend (AFIOS 2.0)

React + Vite frontend for **Bekem OS**.

## Local vs production API

| Mode | Command | Backend |
|------|---------|---------|
| **Local** | `npm run dev` | `http://localhost:4000` (via `/api` proxy) |
| **Production** | `npm run build` / Vercel | `https://bekem-backend-production.up.railway.app` |

Files:
- `.env.development` — local
- `.env.production` — Vercel / production build

## Setup

```bash
npm install
npm run build:shared
npm run dev
```

Run the API locally (`BEKEM-BACKEND` or monorepo `npm run dev:api`) on port 4000.

App: http://localhost:5173

## Demo users

Password: `Bekem@Demo2026!`

| Role | Email |
|------|-------|
| Site Manager | request@bekem.com |
| Store Manager | storeincharge@bekem.com |
| Project Manager | pm@bekem.com |
| Executive | executive@bekem.com |
| Coordinator | coordinator@bekem.com |
| Chairman | chairman@bekem.com |

## Backend

- Production: https://bekem-backend-production.up.railway.app
- Source: https://github.com/Akhilesh2006s/BEKEM-BACKEND

Railway `CORS_ORIGIN` must be origin only, e.g. `https://bekem-frontend-zeta.vercel.app` (no `/login`).
