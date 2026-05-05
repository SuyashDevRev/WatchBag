# WatchBag — Postman

Two files live here:

- `WatchBag.postman_collection.json` — the API collection. Grows alongside the tRPC routers.
- `WatchBag.local.postman_environment.json` — environment with `baseUrl = http://localhost:3000`.

## Import (first time)

1. Open Postman.
2. Top-left **Import** → **Upload Files** → select both JSON files from this folder.
3. In the environment dropdown (top-right), pick **WatchBag — Local**.
4. Start the server: `pnpm --filter @watchbag/server dev`.
5. Open **WatchBag API → Health → GET /health (REST)** and hit **Send**. Expect `200` with `{ "status": "ok", "uptime": <seconds> }`.

## Re-import after updates

Whenever new routes are added, the collection file here is updated in-repo. To sync Postman:

1. Right-click the existing **WatchBag API** collection → **Delete** (or use Import → Overwrite).
2. **Import** → select the updated `WatchBag.postman_collection.json` again.

The collection's `_postman_id` is stable, so re-importing on top of itself is safe.

## tRPC over HTTP — how URLs are shaped

- Query (no input):
  `GET  {{baseUrl}}/trpc/<router>.<procedure>`

- Query (with input):
  `GET  {{baseUrl}}/trpc/<router>.<procedure>?input=<urlEncodedJSON>`
  Example: `?input=%7B%22id%22%3A%22abc%22%7D` ← that's `{"id":"abc"}` URL-encoded.

- Mutation:
  `POST {{baseUrl}}/trpc/<router>.<procedure>`
  Body (raw JSON): the input object, e.g. `{ "title": "My Watchbag" }`.

All responses are wrapped: `{ "result": { "data": <yourData> } }`.

## Auth (coming in Phase 1.4)

Better Auth uses httpOnly session cookies. In Postman:

- Enable **Send cookies** (already on by default).
- Sign up / log in via the `auth.*` routes; Postman will persist the cookie to `{{baseUrl}}` automatically.
- Subsequent calls to protected routes will include the cookie.
