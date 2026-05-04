# AGENTS.md

## Scope
Use this file for work inside guardhub-admin-dashboard/.

## Stack and Layout
- Stack: React 19, Vite, TypeScript, Tailwind CSS v4, React Query, Zustand, Axios.
- Entry: src/main.tsx
- Router: src/App.tsx
- API client: src/api/client.ts
- Auth store: src/store/adminAuthStore.ts
- Screens: src/screens/auth, src/screens/admin
- Shared UI: src/components

## Commands
- Install: npm ci
- Dev: npm run dev
- Build: npm run build

## Project Notes
- VITE_API_URL is the backend base URL. Admin routes are at /admin/*.
- Admin auth is completely separate from the parent dashboard auth.
- Admin JWT payload contains type: 'admin' - the API client must send this token only to /admin/* routes.
- Never call parent-facing routes (/profiles, /devices, /apps, etc.) from this application.
