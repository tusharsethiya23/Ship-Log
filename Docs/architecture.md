Public Ship Log: Architecture
1. System overview
                         ┌────────────────────────┐
                         │      React client      │
                         │ landing · dashboard ·  │
                         │ public profile /u/:name│
                         └───────────┬────────────┘
                                     │ HTTPS (JSON)
                                     ▼
┌──────────────┐  OAuth   ┌────────────────────────┐   ┌────────────────┐
│   GitHub     │◄────────►│     Express API        │◄─►│    MongoDB     │
│ OAuth + REST │          │ auth · users · streaks │   │     Atlas      │
└──────▲───────┘          │ profile · share cards  │   └────────────────┘
       │                  └───────────▲────────────┘
       │ commits                      │ shared services
       │                  ┌───────────┴────────────┐
       └──────────────────│   Scheduler / Workers  │──────► Bluesky API
                          │ ingest · streak · post │──────► Discord webhook
                          └───────────┬────────────┘
                                      └──────► Alerts (admin Discord webhook)

The API and the scheduler run as one Node codebase but as two processes, so a slow job never blocks web requests.

2. Components

React client

Landing page, GitHub login, and a dashboard (connect platforms, choose repos, set timezone, claim the rest day).
Public profile page at /u/:username with the heatmap, streak stats, and log.

Express API

Auth (GitHub OAuth, session via httpOnly JWT cookie).
Read endpoints for public profiles, and write endpoints for settings and the rest day.
Server-rendered share route (/share/:username) that returns HTML with Open Graph tags plus a generated card image, since the React app alone can't provide link previews.

Scheduler / workers (the part that must never silently fail)

Ingest job: for each user, fetch commits since the last check and record active days.
Day-close job: runs at each user's end of day (in their timezone), finalizes the day, applies rest-day and streak rules.
Poster job: publishes the daily post or the broken-streak post.
Every job is idempotent and retried, and failures alert the admin.

External integrations

GitHub: OAuth for login and the REST API for commits.
Bluesky: posting via app password or OAuth.
Discord: per-user webhook URL.
3. Data model (MongoDB)

users

_id, githubId, username, avatarUrl,
timezone, dayCutoffHour,
repos: [{ fullName, isPrivate, trackedSince }],
integrations: { bluesky: {...encrypted}, discordWebhook: "..." },
restDayWeekday?, createdAt

days (one document per user per calendar day)

_id, userId, date (YYYY-MM-DD in user's tz),
status: "active" | "rest" | "missed",
commitCount, repoNames? (opt-in), note?,
finalizedAt

Unique index on { userId, date }.

streaks (cached snapshot, recomputable from days)

userId, current, longest, totalActive,
lastActiveDate, restUsedThisWeek, weekStart

posts (audit and idempotency)

_id, userId, type: "daily" | "broken" | "weekly",
platform, date, status: "sent" | "failed" | "pending",
attempts, error?, sentAt

Unique index on { userId, type, platform, date }, so a retry can never double-post.

4. API surface
Method	Route	Auth	Purpose
GET	/auth/github and /auth/github/callback	none	OAuth login
GET	/api/me	user	Current user and settings
PATCH	/api/me	user	Timezone, repos, integrations
POST	/api/rest-day	user	Claim today as the weekly rest day
GET	/api/u/:username	public	Profile, streak, recent days
GET	/api/u/:username/calendar?year=	public	Heatmap data
GET	/share/:username	public	HTML with OG tags
GET	/share/:username/card.png	public	Generated share image
POST	/internal/jobs/:name	secret	Trigger a job from external cron (if not using in-process scheduler)
5. Core flows

Daily lifecycle (per user)

Throughout the day, the ingest job checks tracked repos for new commits and marks the day active.
At the user's day cutoff, the day-close job finalizes the day.
Commits found → active, streak +1.
No commits and rest day claimed and available → rest, streak unchanged.
Neither → missed. If the weekly rest day was already used, the streak resets.
The poster job writes a posts record (status pending), publishes to each connected platform, then marks it sent.
Failures retry with backoff, then alert the admin.

Streak calculation: derive the streak from days (the source of truth). The streaks collection is a cache that can always be rebuilt, which avoids drift bugs.

6. Suggested folder structure
ship-log/
├── client/                    # React (Vite)
│   └── src/
│       ├── pages/             # Landing, Dashboard, Profile
│       ├── components/        # Heatmap, StreakCard, IntegrationForm
│       └── api/               # fetch helpers
├── server/
│   └── src/
│       ├── app.js             # Express setup
│       ├── routes/            # auth, me, profile, share, internal
│       ├── models/            # User, Day, Streak, Post
│       ├── services/
│       │   ├── github.js      # commit fetching
│       │   ├── streak.js      # rules engine (pure, unit-tested)
│       │   ├── posting/       # bluesky.js, discord.js
│       │   └── shareCard.js
│       ├── jobs/              # ingest.js, dayClose.js, poster.js
│       ├── worker.js          # scheduler entry point (separate process)
│       └── config/
└── README.md
7. Cross-cutting concerns
Timezones: store IANA timezone names, and compute "today" per user with a library like Luxon. Never use server-local dates.
Security: encrypt stored platform tokens at rest, request minimal GitHub scopes (public repos by default), rate-limit public endpoints, and validate all input.
Privacy: the public API returns only commit counts unless the user opted in to more. Private repo names never appear.
Reliability: idempotent jobs, unique indexes as a safety net, structured logging, and an admin alert on any failed job or post.
Testing priority: unit-test streak.js heavily (rest day, week boundary, timezone edge cases, DST). This is where most bugs will be.
8. Deployment
Client: Vercel or Netlify (static).
API and worker: an always-on host such as Render, Railway, or Fly.io, running two processes (web and worker).
Database: MongoDB Atlas free tier to start.
Secrets: environment variables for GitHub OAuth credentials, JWT secret, encryption key, and the admin webhook.
Scaling path: if the user base grows, move the worker loop to a queue (BullMQ with Redis) so per-user jobs run in parallel.