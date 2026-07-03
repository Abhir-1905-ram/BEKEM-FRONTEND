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

API is expected at http://localhost:4000 (proxied via `/api`). Set `VITE_API_PROXY_TARGET` if your API runs elsewhere.

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

## Note

This repository is **frontend only**. The API lives in a separate backend repo / monorepo `apps/api`.
