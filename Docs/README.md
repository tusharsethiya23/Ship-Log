# Ship Log

A public coding streak that runs itself. Ship Log checks your GitHub commits every day, keeps your streak, shows it on a public profile page, and posts it to Discord and Bluesky automatically. Miss a day and the "streak broken" post goes out too, so quitting has a visible cost.

## Features

- Log in with GitHub; no manual logging. A day counts when you push at least one commit to a tracked repo.
- Streak engine with one rest day per week (Monday to Sunday).
- Per-user timezone and "day ends at" hour, so night owls are handled.
- Public profile page (`/u/username`) with the streak, stats, and a year heatmap.
- Automatic daily posts to Discord (webhook) and Bluesky (app password), with retries.
- "Streak broken" posts, and a preview card image for shared links.
- Admin alerts to a Discord channel when a job or post fails.

## Tech stack

- **Server:** Node.js, Express 5, MongoDB with Mongoose, zod, Luxon, `@napi-rs/canvas`
- **Client:** React, Vite, React Router, Tailwind CSS
- **Integrations:** GitHub OAuth and REST API, Discord webhooks, Bluesky (AT Protocol)

## How it works

1. You log in with GitHub and choose your timezone and repos.
2. Every 15 minutes the **ingest job** counts your commits for the current day.
3. Every 5 minutes the **day-close job** locks any finished day as `active`, `rest`, or `missed` and updates the streak. A final GitHub check runs first, so late commits still count.
4. Every 5 minutes the **poster job** publishes posts for newly closed days, retrying failures.

The `days` collection is the source of truth. The `streaks` collection is a cache that can always be rebuilt from it.

### Streak rules

- A day with at least one commit is **active**: the streak grows by 1.
- A day with no commits where you claimed the weekly rest day (and haven't used it yet this week) is **rest**: the streak stays the same.
- Anything else is **missed**: the streak resets to 0.
- Commits always win. Claiming a rest day and then committing counts as active and does not spend the rest day.
- If GitHub can't be reached, a day stays open instead of being counted as missed.

## Project structure

```
ship-log/
├── client/                  React app
│   └── src/
│       ├── api/             calls to the server
│       ├── components/      profile/ and dashboard/ pieces
│       ├── pages/           Landing, Dashboard, Profile
│       └── utils/           date helpers and shared Tailwind classes
└── server/
    ├── assets/fonts/        fonts used to draw share cards
    ├── scripts/             manual tools (close-days, run-poster, test-alert)
    ├── tests/unit/          streak, date, and post-text tests
    └── src/
        ├── config/          env validation, database, logger
        ├── models/          User, Day, Streak, Post
        ├── routes/          URL tables
        ├── controllers/     request handlers
        ├── middleware/      auth, validation, rate limits, errors
        ├── services/        streak rules, GitHub, ingest, day close,
        │                    profile, share card, posting, alerts
        ├── jobs/            scheduler and the three jobs
        ├── validators/      request schemas
        └── utils/           time, crypto, tokens, errors
```

## Run it locally

**Requirements:** Node.js 20.6 or newer (22 recommended) and a MongoDB database (local or MongoDB Atlas).

1. Install dependencies:
```bash
   npm install
```
2. Create a GitHub OAuth app (GitHub, Settings, Developer settings, OAuth Apps):
   - Homepage URL: `http://localhost:5173`
   - Redirect URI: `http://localhost:4000/auth/github/callback`
   - Untick "Expire user access tokens"
3. Copy the example settings and fill them in:
```bash
   cp server/.env.example server/.env
```
   (On Windows PowerShell: `copy server\.env.example server\.env`.)
   Generate each secret with:
```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
4. Add two fonts for the share card to `server/assets/fonts/`, named `font-regular.ttf` and `font-bold.ttf` (for example Inter, which is open source).
5. Start the three processes in separate terminals:
```bash
   npm run dev --workspace server          # API on http://localhost:4000
   npm run dev --workspace client          # website on http://localhost:5173
   npm run dev:worker --workspace server   # scheduled jobs
```
6. Open `http://localhost:5173` and log in.

## Scripts

| Command | What it does |
|---|---|
| `npm test --workspace server` | Runs the unit tests |
| `npm run close-days --workspace server -- <username> [ISO time]` | Closes finished days for a user, optionally pretending it is a later time |
| `npm run poster --workspace server` | Queues and sends posts once |
| `npm run test-alert --workspace server` | Sends a test admin alert |
| `npm run build` | Builds the website into `client/dist` |
| `npm start` | Starts the server (serves the built website too) |

## Settings

All settings live in `server/.env` (see `server/.env.example`).

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | Port the server listens on |
| `MONGO_URI` | MongoDB connection string |
| `CLIENT_URL` | Address of the website (used for redirects and links in posts) |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth app credentials |
| `JWT_SECRET` | Signs login cookies (32+ characters) |
| `TOKEN_ENCRYPTION_KEY` | Encrypts stored tokens (exactly 64 hex characters) |
| `INTERNAL_JOB_SECRET` | Protects internal routes (16+ characters) |
| `ADMIN_ALERT_WEBHOOK` | Discord webhook for failure alerts (optional) |
| `RUN_SCHEDULER` | `true` makes the web server run the jobs itself (production) |

## Deploy

One web service runs everything: Express serves the API and the built website, and the scheduler runs inside it.

- **Build command:** `npm install --include=dev && npm run build`
- **Start command:** `npm start`
- **Health check path:** `/health`
- Set every variable above in the host's dashboard, with `NODE_ENV=production`, `RUN_SCHEDULER=true`, and `CLIENT_URL` set to the site's address.
- Create a separate GitHub OAuth app for production with the live address as the homepage and `<address>/auth/github/callback` as the redirect URI.
- Use an always-on plan. A service that sleeps stops the scheduler, so posts arrive late (streak counts stay correct, because days are re-checked against GitHub history).

## Known limitations

- Only public repos can be read. The login requests the minimum permission, `read:user`.
- Only one worker should run at a time, otherwise a post could occasionally go out twice.
- Commits must be linked to your GitHub account through the email on the commit.

## Ideas for later

Private repo support, an evening "streak at risk" reminder, a weekly summary post, an embeddable README badge, account deletion, and more posting platforms.

## License

Choose a license before making the repo public.