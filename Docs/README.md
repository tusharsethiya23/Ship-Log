# Ship Log

A public coding streak that runs itself. Ship Log checks your GitHub activity every day, keeps your streak, shows it on a public profile page, and can post it to Discord and Bluesky automatically. Miss a day and the "streak broken" post goes out too, so quitting has a visible cost.

## Features

- Log in with GitHub; no manual logging. A day counts when you push at least one commit to a tracked public repo.
- Optional: also count private activity, using the private contribution count GitHub shows on your profile (no private repo names, messages, or code are read).
- Streak engine with one rest day per week (Monday to Sunday), claimable and cancellable from the dashboard.
- Per-user timezone and "day ends at" hour, so night owls are handled.
- Dashboard with your live streak, quick actions, and settings.
- Public profile page (`/u/username`) with the streak, stats, and a year heatmap.
- Embeddable README badge (`/badge/username/streak.svg`).
- Automatic daily posts to Discord (webhook) and Bluesky (app password), with retries, plus "streak broken" posts.
- Link previews: a generated streak card image for shared links and Bluesky posts.
- Admin alerts to a Discord channel when a job or post fails.
- Account deletion that erases everything and revokes the app's GitHub access.

## Tech stack

- **Server:** Node.js, Express 5, MongoDB with Mongoose, zod, Luxon, `@napi-rs/canvas`
- **Client:** React, Vite, React Router, Tailwind CSS
- **Integrations:** GitHub OAuth, REST and GraphQL APIs, Discord webhooks, Bluesky (AT Protocol)

## How it works

1. You log in with GitHub and choose your timezone and repos.
2. Every 15 minutes the **ingest job** counts your activity for the current day.
3. Every 5 minutes the **day-close job** locks any finished day as `active`, `rest`, or `missed` and updates the streak. A final GitHub check runs first, so late commits still count.
4. Every 5 minutes the **poster job** publishes posts for newly closed days, retrying failures.

The `days` collection is the source of truth. The `streaks` collection is a cache that can always be rebuilt from it.

### Streak rules

- A day with at least one commit is **active**: the streak grows by 1.
- A day with no commits where you claimed the weekly rest day (and haven't used it yet this week) is **rest**: the streak stays the same.
- Anything else is **missed**: the streak resets to 0.
- Commits always win. Claiming a rest day and then committing counts as active and does not spend the rest day.
- If GitHub can't be reached, a day stays open instead of being counted as missed.

## Privacy and your data

- Ship Log asks GitHub for one permission only: `read:user`.
- Stored per user: GitHub id, username and avatar, settings, an encrypted GitHub token, the status and commit count of each day, post history, and (if connected) an encrypted Discord webhook and Bluesky app password.
- The public API shows only streak numbers and, per day, the status and commit count. Repo names and tokens are never exposed.
- "Delete account" erases all of the above and revokes the app's authorization on GitHub.

## Project structure

```
ship-log/
├── .github/workflows/       automatic checks on every push
├── client/                  React app
│   └── src/
│       ├── api/             calls to the server
│       ├── components/      profile/ and dashboard/ pieces
│       ├── pages/           Landing, Dashboard, Profile
│       └── utils/           date helpers and shared Tailwind classes
└── server/
    ├── assets/fonts/        fonts used to draw share cards
    ├── scripts/             manual tools and the check scripts
    ├── tests/               unit tests and an app start-up test
    └── src/
        ├── config/          env validation, database, logger
        ├── models/          User, Day, Streak, Post
        ├── routes/          URL tables
        ├── controllers/     request handlers
        ├── middleware/      auth, validation, rate limits, errors
        ├── services/        streak rules, GitHub, ingest, day close, profile,
        │                    badge, share card, posting, alerts
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
4. Add two fonts for the share card to `server/assets/fonts/`, named `font-regular.ttf` and `font-bold.ttf` (for example Inter, which is open source). Without them cards use a fallback font.
5. Start the three processes in separate terminals:
```bash
   npm run dev --workspace server          # API on http://localhost:4000