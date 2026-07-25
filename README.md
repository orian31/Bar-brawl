# Bar Brawl 🍻

A real-time pub trivia party game. One person hosts on a big screen and gets a
4-letter room code; everyone else joins on their phone, answers multiple-choice
questions against the clock, and climbs a live leaderboard.

## Project layout

- `server/` — Node + Express + Socket.IO backend. Holds room/game state in memory.
- `client/` — React (Vite) frontend. Host screen + player screen in one app.

## Run it locally

```bash
# terminal 1
cd server
npm install
npm start          # listens on :4000

# terminal 2
cd client
npm install
cp .env.example .env   # VITE_SERVER_URL=http://localhost:4000
npm run dev             # opens on :5173
```

Open the dev URL in one tab, click **Host a game**, then open it in another
tab (or another device on the same network) to join with the room code.

## Deploying

The frontend is static and the backend needs a long-lived process (Socket.IO
keeps open connections), so they deploy to two different places:

### 1. Server → Render

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and point it at this repo — it will
   pick up `render.yaml` and create a `bar-brawl-server` web service rooted at
   `server/`.
3. Set the `CLIENT_ORIGIN` env var to your deployed client URL (e.g.
   `https://bar-brawl.vercel.app`) once you have it, so CORS allows it.
4. Note the resulting server URL, e.g. `https://bar-brawl-server.onrender.com`.

(Any host that runs a persistent Node process works too — Fly.io, Railway,
a VPS, etc. Just run `npm install && npm start` inside `server/`.)

### 2. Client → Vercel (or Netlify)

1. In Vercel, **Add New Project**, import this repo, and set the project's
   **Root Directory** to `client`.
2. Framework preset: Vite (auto-detected). Build command `npm run build`,
   output directory `dist` (defaults are fine).
3. Add an environment variable `VITE_SERVER_URL` set to your Render server
   URL from step 1.
4. Deploy. Vercel will give you a URL like `https://bar-brawl.vercel.app`.
5. Go back to Render and set `CLIENT_ORIGIN` to that exact URL, then redeploy
   the server so CORS matches.

Netlify works the same way: base directory `client`, build command
`npm run build`, publish directory `client/dist`, same `VITE_SERVER_URL` env
var, and `client/vercel.json`'s SPA rewrite has an equivalent Netlify
`_redirects` need if you go that route (`/* /index.html 200`).

## How the game works

1. Host taps **Host a game** → gets a room code.
2. Players open the site, enter the code + their name, and land in the lobby.
3. Host taps **Start game**; everyone gets the same question at the same time
   with a 15s timer.
4. Answers score higher the faster they're correct. Once everyone's answered
   (or the timer runs out) the correct answer and updated leaderboard reveal.
5. Host advances through 6 rounds, then a final leaderboard is shown.

Room state lives in server memory, so restarting the server clears all active
games — fine for a single bar night, not meant for long-term persistence.
