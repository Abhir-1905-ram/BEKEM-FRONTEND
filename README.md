# BEKEM Frontend (AFIOS 2.0)

React + Vite frontend for **Bekem OS** — construction ERP for Bekem Infra.

## Stack

- React 18, TypeScript, Vite
- TanStack Query, Zustand, React Router
- Tailwind CSS
- Shared types/DTOs in `packages/shared`

## Setup

```bash
npm install
npm run build:shared
npm run dev
```

App: http://localhost:5173

API defaults to production Railway:

`https://bekem-backend-production.up.railway.app/api`

Copy `.env.example` to `.env` to override. For a local API:

```bash
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build shared package + production web bundle |
| `npm run preview` | Preview production build |

## Demo users

Password for all: `Bekem@Demo2026!`

| Role | Email |
|------|-------|
| Site Manager | request@bekem.com |
| Store Manager | storeincharge@bekem.com |
| Project Manager | pm@bekem.com |
| Executive | executive@bekem.com |
| Coordinator | coordinator@bekem.com |
| Chairman | chairman@bekem.com |

## Backend

Production API: https://bekem-backend-production.up.railway.app  

Backend source: https://github.com/Akhilesh2006s/BEKEM-BACKEND

On Railway, set `CORS_ORIGIN` to your frontend URL (e.g. `http://localhost:5173` or your Vercel/Netlify domain).

## Note

This repository is **frontend only** (React app + `packages/shared`).
