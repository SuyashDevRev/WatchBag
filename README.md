# WatchBag

Create and share watchlists of movies, TV shows, and anime. A full-stack TypeScript rebuild of the original Express/EJS/MongoDB app, now a pnpm monorepo with end-to-end type safety.

## Stack

| Layer           | Choice                                                       |
| --------------- | ------------------------------------------------------------ |
| Language        | TypeScript (strict)                                          |
| Package manager | pnpm (workspaces)                                            |
| Node            | 22 LTS                                                       |
| Backend         | Express 5 + tRPC v11                                         |
| Database        | Postgres on Neon (serverless)                                |
| ORM             | Drizzle + drizzle-kit                                        |
| Auth            | Better Auth — email/password + Google OAuth, session cookies |
| Validation      | Zod v4 (shared between server and web)                       |
| Movie data      | TMDB                                                         |
| Image uploads   | Cloudinary (signed direct-to-CDN)                            |
| Frontend        | Vite + React 19 + React Router 7                             |
| Server state    | TanStack Query via tRPC React client                         |
| Styling         | Tailwind v4 with dark-first + warm-blush light mode          |
| Drag & drop     | @dnd-kit                                                     |
| Animation       | Framer Motion                                                |
| Lint / format   | ESLint 9 (flat config) + Prettier 3                          |

## Repo layout

```
WatchBag/
├── apps/
│   ├── server/          # Express + tRPC + Drizzle
│   └── web/             # Vite + React + React Router
├── packages/
│   └── shared/          # Zod schemas shared between server and web
├── legacy/              # Archived original Express/EJS/Mongo app
├── postman/             # Importable Postman collection for API exploration
├── plan.md              # Phased modernization plan
├── eslint.config.js
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Local setup

### Prerequisites

- Node 22+ (`.nvmrc` pins this)
- pnpm — `npm install -g pnpm` if you don't have it
- A Neon Postgres project — free tier is fine
- A TMDB account + v4 Read Access Token (free) — https://www.themoviedb.org/settings/api
- A Google Cloud OAuth Client (Web) — https://console.cloud.google.com/apis/credentials
- A Cloudinary account — for avatar uploads
- `openssl` — to generate a session secret

### Clone and install

```bash
git clone <this-repo>
cd WatchBag
pnpm install
```

### Server environment

Create `apps/server/.env` from the template:

```bash
cp apps/server/.env.example apps/server/.env
```

Fill in the values:

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Neon — use the pooled connection string
DATABASE_URL=postgresql://<user>:<pass>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require

# Better Auth. Generate a secret with: openssl rand -base64 48
BETTER_AUTH_SECRET=<48+ char random string>
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (Web application). Authorized JS origins should include both
# http://localhost:3000 and http://localhost:5173; redirect URI should be
# http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=<client id>
GOOGLE_CLIENT_SECRET=<client secret>

# TMDB v4 Read Access Token (the long eyJ... JWT)
TMDB_API_KEY=<token>

# Cloudinary
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
```

### Database

Apply migrations to your Neon database:

```bash
pnpm --filter @watchbag/server db:migrate
```

Other db commands:

```bash
pnpm --filter @watchbag/server db:generate   # generate migration SQL after editing schema.ts
pnpm --filter @watchbag/server db:push       # quick push schema without a migration file (dev only)
pnpm --filter @watchbag/server db:studio     # open Drizzle Studio in the browser
```

### Run

Two terminals, or one with background processes:

```bash
pnpm --filter @watchbag/server dev    # http://localhost:3000
pnpm --filter @watchbag/web dev       # http://localhost:5173
```

Or from the repo root:

```bash
pnpm dev
```

which runs both in parallel via `pnpm -r --parallel dev`.

## Scripts

Repo-root scripts run across all workspaces:

| Command              | What it does                                                |
| -------------------- | ----------------------------------------------------------- |
| `pnpm dev`           | Start server and web in parallel                            |
| `pnpm build`         | Build all workspaces                                        |
| `pnpm typecheck`     | Type-check server, web, and shared                          |
| `pnpm lint`          | Run ESLint over the repo                                    |
| `pnpm format`        | Run Prettier write                                          |
| `pnpm format:check`  | Check Prettier formatting                                   |

Per-workspace scripts exist too (`pnpm --filter @watchbag/server ...`, `@watchbag/web`, `@watchbag/shared`).

## Architecture notes

- **End-to-end type safety.** `apps/web` imports `AppRouter` as a type from `apps/server`, giving the tRPC React client full autocomplete and return-type inference for every procedure. No code generation step.
- **Shared schemas.** `packages/shared` exports the Zod input schemas used by both server routers (for runtime validation) and web forms (via `@hookform/resolvers`).
- **Session cookies, not bearer tokens.** Better Auth stores sessions in Postgres (`sessions` table) and sets an httpOnly `watchbag.session_token` cookie. The web app talks to the API with `credentials: "include"`; nothing stored in `localStorage`.
- **Cloudinary direct uploads.** The server signs upload params; the browser POSTs the file straight to Cloudinary. Files never pass through our backend.
- **Optimistic UI on the DnD board.** Drag-to-move and drag-from-search both write to the TanStack Query cache on `onMutate` and roll back on error — no flash between drop and the tile appearing.
- **Rate limiting.** `/api/auth/sign-up/email` and `/api/auth/sign-in/email` are gated by an in-memory limiter (5/hr and 10/15min per IP). Swap to Upstash/Redis when going multi-instance.

## Postman

An importable collection lives at `postman/WatchBag.postman_collection.json` with every tRPC procedure and Better Auth endpoint pre-configured. See `postman/README.md` for the import walkthrough.

## Deployment

Not committed to a deploy target yet. Candidates:

- **Vercel (web) + Fly.io or Render (server) + Neon (DB)** — best free-tier fit
- **Railway (server + DB) + Vercel (web)** — fewer dashboards
- **Render (everything)** — one roof

Follow-ups regardless of host:

- Set production env vars in the host's secret store (never commit `.env`)
- Run DB migrations as a deploy step (not at runtime)
- Add a production Google OAuth redirect URI: `https://<api-domain>/api/auth/callback/google`
- Add the production web origin to `CORS_ORIGIN` and Better Auth's trusted origins
- Point `BETTER_AUTH_URL` at the API's production URL

## License

ISC
