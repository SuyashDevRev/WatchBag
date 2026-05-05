# WatchBag — Modernization Plan

Rewrite of the original Express/EJS/MongoDB app into a modern, type-safe, full-stack TypeScript project. Goal: ship a public v1 with a clean minimalist UX, then iterate.

## Tech stack

| Layer           | Choice                                        |
| --------------- | --------------------------------------------- |
| Language        | TypeScript (strict)                           |
| Package manager | pnpm (workspaces)                             |
| Node            | 22 LTS                                        |
| Backend         | Express 5 + tRPC v11                          |
| Database        | Postgres (Neon, serverless)                   |
| ORM             | Drizzle + drizzle-kit migrations              |
| Auth            | Better Auth (email/password + Google OAuth)   |
| Validation      | Zod                                           |
| Frontend        | Vite + React 19 + React Router 7              |
| Server state    | TanStack Query (via tRPC React client)        |
| Styling         | Tailwind v4 + shadcn/ui, light/dark toggle    |
| Movie data      | TMDB API                                      |
| Image uploads   | Cloudinary (for user-uploaded covers/avatars) |
| Tooling         | ESLint 9 (flat config) + Prettier 3           |
| Tests           | Deferred to post-v1                           |
| Deployment      | TBD — decide in Phase 4                       |

## Repo layout

```
WatchBag/
├── apps/
│   ├── server/          # Express + tRPC + Drizzle
│   └── web/             # Vite + React + React Router 7
├── packages/
│   └── shared/          # Zod schemas, shared types, tRPC router types
├── .eslintrc / eslint.config.js
├── .prettierrc
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

The legacy app stays untouched at the repo root until Phase 1 lands; then it gets archived under `legacy/` (or removed) in a single cleanup commit.

---

## Phase 1 — Backend

Goal: a running tRPC server, Postgres-backed, with auth and all domain routes wired up.

1. **Workspace bootstrap**
   - `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`.
   - Move legacy code into `legacy/` (preserved for reference).
   - Shared ESLint 9 flat config + Prettier 3 at repo root.

2. **`apps/server` scaffold**
   - Express 5 + tRPC v11 adapter.
   - `tsx` for dev, `tsc` for build.
   - `.env` + env validation via Zod (`env.ts`).
   - Pino for structured logging.
   - CORS, helmet, cookie parser.

3. **Database — Drizzle + Neon**
   - Drizzle schema for: `users`, `sessions`, `accounts` (Better Auth tables), `watchbags`, `shows`, `watchbag_shows` (join with status enum: `current | watched | on_hold`), `reviews`.
   - `drizzle.config.ts` + first migration (`drizzle-kit generate` + `migrate`).
   - Neon connection via `@neondatabase/serverless` + `drizzle-orm/neon-http`.

4. **Auth — Better Auth**
   - Email/password + Google OAuth.
   - Session cookies (httpOnly, secure, SameSite=Lax).
   - Middleware to attach `ctx.user` to every tRPC request.
   - `protectedProcedure` helper.

5. **tRPC routers**
   - `auth` — signup, login, logout, me.
   - `watchbag` — list (public/explore), listMine, get, create, update, delete, toggleStatus (public/private).
   - `show` — search (TMDB proxy), getById (TMDB proxy, cached), addToWatchbag, removeFromWatchbag, moveStatus (drag-and-drop reorder).
   - `review` — create, list, delete.
   - `upload` — signed Cloudinary upload URL (user avatars + watchbag covers).

6. **TMDB integration**
   - `tmdb.ts` client with typed responses (Zod).
   - Short in-memory LRU cache for repeated lookups.

7. **Shared package**
   - Export tRPC `AppRouter` type and Zod schemas for the frontend to consume.

Deliverable: `pnpm --filter server dev` runs, routes callable via tRPC panel or curl, DB migrations applied.

---

## Phase 2 — Frontend

Goal: a polished React SPA that consumes the tRPC API, with the full user flow working against live backend.

1. **`apps/web` scaffold**
   - Vite + React 19 + TypeScript.
   - React Router 7 (data routers, file-less route config).
   - tRPC React client + TanStack Query provider.
   - Tailwind v4 + shadcn/ui init, base tokens + dark mode via `class` strategy.
   - `next-themes`-style toggle (or a 20-line custom hook + `localStorage`).

2. **Layout + theming**
   - App shell: top nav, auth state, theme toggle.
   - Design tokens tuned for minimalist feel (lots of whitespace, restrained palette, one accent).
   - Reusable primitives via shadcn: Button, Input, Card, Dialog, DropdownMenu, Toast, Tabs, Badge.

3. **Routes**
   - `/` — landing/home.
   - `/login`, `/signup` — Better Auth flows + Google button.
   - `/explore` — public watchbags grid.
   - `/explore/:id` — public watchbag detail.
   - `/mywatchbags` — authed list.
   - `/mywatchbags/:id` — detail + three-column (current/watched/on-hold) drag-and-drop board.
   - `/mywatchbags/:id/edit` — edit metadata + cover upload.
   - `/search` — TMDB search results → add to a watchbag.
   - `/settings` — profile, avatar upload, theme, logout.

4. **Drag-and-drop**
   - `@dnd-kit/core` + `@dnd-kit/sortable` for the three-bucket board.
   - Optimistic updates via TanStack Query `onMutate`.

5. **Forms + validation**
   - `react-hook-form` + Zod resolver, sharing schemas from `packages/shared`.

6. **Uploads**
   - Frontend requests signed params from server, uploads directly to Cloudinary, then sends the returned URL back to persist.

7. **Error + loading UX**
   - Route-level error boundaries, skeletons for lists, toast on mutation errors.

Deliverable: full user journey works locally end-to-end (signup → create watchbag → search show → add to bag → drag across columns → publish to explore).

---

## Phase 3 — Integration & polish

1. **End-to-end type safety verified** — `AppRouter` flows from server → shared → web with zero `any`.
2. **Auth hardening** — rate limiting on login/signup, CSRF posture review, secure cookie flags per env.
3. **Empty states + micro-interactions** — onboarding empty state for new users, subtle transitions.
4. **Accessibility pass** — keyboard nav on the DnD board, focus states, color contrast in both themes, semantic headings.
5. **SEO basics** — meta tags, OG images for public watchbag pages.
6. **Error monitoring** — add Sentry SDK to both server and web (free tier).
7. **Analytics** — Plausible or PostHog (lightweight, privacy-friendly) to see what users actually do.
8. **README rewrite** — setup, env vars, architecture diagram.

---

## Phase 4 — Build & deployment

Decide once Phase 3 is feature-complete. Options to evaluate:

- **Split**: Vercel (web) + Fly.io or Render (server) + Neon (DB). More moving parts, best free-tier fit.
- **Unified**: Railway for server+DB; Vercel for web. Simpler ops.
- **All-on-Render**: one dashboard, predictable pricing.

Steps (independent of chosen host):

1. Production build scripts for both apps + Docker image for server if needed.
2. Env var audit — every secret lives in the host's secret store.
3. Database migrations run on deploy (CI step, not at runtime).
4. Health check endpoint + uptime ping.
5. Custom domain + HTTPS.
6. First public deploy → share with friends for feedback.

---

## Open decisions (to revisit)

- Deployment host (Phase 4).
- Whether to let users import their OMDB-era MongoDB data later (not in v1).
- AWS S3 migration for uploads — explicitly deferred to v2.
- Tests — add in v1.1 once the shape is stable.

## Success criteria for v1

- A stranger can sign up, build a watchbag, and share a link in under two minutes.
- Page loads feel instant on a decent connection.
- Site looks good in both light and dark.
- Zero runtime type errors; ESLint and Prettier clean on every commit.
