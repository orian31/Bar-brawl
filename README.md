# Bar Brawl 🍻

A pub trivia party game. One person hosts on a big screen and gets a
4-letter room code; everyone else joins on their phone, answers multiple-choice
questions against the clock, and climbs a live leaderboard.

## Project layout

Everything deploys as a single Vercel project — no separate backend host.

- `client/src/` — React (Vite) frontend. Host screen + player screen in one app.
- `client/api/` — Vercel serverless functions (Node runtime) that hold room
  state in Upstash Redis. The frontend polls these once a second; there's no
  persistent server process to run.

## Run it locally

You need the Vercel CLI to run the `api/` functions locally (plain `vite dev`
only serves the frontend, not the serverless routes):

```bash
npm install -g vercel
cd client
npm install
cp .env.example .env      # fill in Redis credentials, see below
vercel dev                 # serves frontend + /api on one port
```

Open the dev URL in one tab, click **Host a game**, then open it in another
tab (or another device on the same network/Wi-Fi) to join with the room code.

### Getting a Redis instance for local dev

Create a free database at [upstash.com](https://upstash.com) (Redis →
Create Database), then copy its **REST URL** and **REST Token** from the
database's API section into `client/.env` as `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN`.

## Deploying

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In Vercel, **Add New Project**, import the repo, and set **Root Directory**
   to `client`. Framework preset Vite is auto-detected; build/output defaults
   are fine.
3. In the project's **Storage** tab, **Browse Storage** and pick **Upstash**
   (not the separate "Redis" option — that's a TCP-based Redis Cloud
   integration meant for long-running servers, not serverless functions).
   Create a Redis database and connect it to the project.
4. That's it for env vars — the integration injects its own credentials
   automatically (typically `KV_REST_API_URL` / `KV_REST_API_TOKEN`, a
   naming holdover from when this integration was called Vercel KV; the
   code reads either that pair or the plain `UPSTASH_REDIS_REST_*` names).
5. Deploy. Since the API routes are same-origin with the frontend, there's no
   CORS config and no second service to stand up.

Netlify doesn't run this kind of Node serverless function the same way, so
Vercel is the simpler path for this project as structured.

## How the game works

1. Host taps **Host a game** → gets a room code and a host token (kept in
   memory in the browser tab).
2. Players open the site, enter the code + their name, and land in the lobby.
   They get a player id back, generated server-side.
3. Host taps **Start game**; everyone gets the same question at the same time
   with a 15s timer, anchored to a server timestamp so it stays in sync even
   across polls.
4. Answers score higher the faster they're correct. Once everyone's answered
   (or the timer runs out), the next poll from any client resolves the round:
   correct answer revealed, scores applied exactly once via an optimistic
   Redis transaction, updated leaderboard shown.
5. Host advances through 6 rounds, then a final leaderboard is shown.

Room state lives in Redis with a 6-hour expiry, so idle games clean
themselves up — nothing to restart or manage between bar nights.

## Why polling instead of WebSockets

The game used to run on a Socket.IO server, but that needs a long-lived
process to hold open connections — something Vercel's serverless functions
don't do (each request runs in its own short-lived, stateless invocation).
Rather than stand up a second always-on host just for sockets, the game
state moved to Redis and the client polls for updates every second, which is
plenty responsive for a trivia game and keeps the whole thing on one
platform.
