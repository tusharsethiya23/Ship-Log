ship-log/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # lint + test on every PR
│       └── deploy.yml              # optional deploy pipeline
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── STREAK_RULES.md             # rest-day and timezone rules, written down
├── scripts/
│   ├── seed.js                     # fake users/days for local dev
│   └── rebuild-streaks.js          # recompute streaks cache from `days`
├── .gitignore
├── .editorconfig
├── .prettierrc
├── package.json                    # root scripts (dev, lint, test) + workspaces
├── docker-compose.yml              # local MongoDB
└── README.md

├── client/                         # React (Vite)
│   ├── public/
│   │   ├── favicon.svg
│   │   └── robots.txt
│   ├── src/
│   │   ├── main.jsx                # app entry
│   │   ├── App.jsx                 # router setup
│   │   ├── api/
│   │   │   ├── http.js             # fetch wrapper (credentials, errors)
│   │   │   ├── auth.js
│   │   │   ├── me.js
│   │   │   └── profile.js
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Loader.jsx
│   │   │   │   └── ErrorState.jsx
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── Layout.jsx
│   │   │   ├── profile/
│   │   │   │   ├── Heatmap.jsx     # calendar heatmap
│   │   │   │   ├── StreakCard.jsx
│   │   │   │   ├── StatsRow.jsx
│   │   │   │   └── DayLog.jsx
│   │   │   └── dashboard/
│   │   │       ├── RepoPicker.jsx
│   │   │       ├── TimezoneSelect.jsx
│   │   │       ├── RestDayButton.jsx
│   │   │       └── IntegrationForm.jsx   # Bluesky + Discord setup
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useProfile.js
│   │   │   └── useCalendar.js
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Profile.jsx         # /u/:username
│   │   │   └── NotFound.jsx
│   │   ├── styles/
│   │   │   └── index.css
│   │   └── utils/
│   │       ├── date.js
│   │       └── constants.js
│   ├── .env.example                # VITE_API_URL
│   ├── index.html
│   ├── package.json
│   └── vite.config.js

├── server/                         # Node + Express
│   ├── src/
│   │   ├── server.js               # web process entry (starts HTTP)
│   │   ├── worker.js               # worker process entry (starts scheduler)
│   │   ├── app.js                  # Express app setup (middleware, routes)
│   │   ├── config/
│   │   │   ├── env.js              # validates + exports env vars
│   │   │   ├── db.js               # Mongo connection
│   │   │   └── logger.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Day.js
│   │   │   ├── Streak.js
│   │   │   └── Post.js
│   │   ├── routes/
│   │   │   ├── index.js            # mounts all routers
│   │   │   ├── auth.routes.js
│   │   │   ├── me.routes.js
│   │   │   ├── profile.routes.js
│   │   │   ├── share.routes.js     # OG tags + card image
│   │   │   └── internal.routes.js  # secret-protected job triggers
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── me.controller.js
│   │   │   ├── profile.controller.js
│   │   │   └── share.controller.js
│   │   ├── middleware/
│   │   │   ├── requireAuth.js
│   │   │   ├── requireInternalSecret.js
│   │   │   ├── rateLimit.js
│   │   │   ├── validate.js         # request schema validation
│   │   │   └── errorHandler.js
│   │   ├── services/
│   │   │   ├── github.service.js   # OAuth exchange + commit fetching
│   │   │   ├── streak.service.js   # pure rules engine (rest day, resets)
│   │   │   ├── day.service.js      # finalize a day for a user
│   │   │   ├── shareCard.service.js
│   │   │   ├── alert.service.js    # admin Discord alerts
│   │   │   └── posting/
│   │   │       ├── index.js        # picks platforms for a user
│   │   │       ├── bluesky.js
│   │   │       ├── discord.js
│   │   │       └── templates.js    # post text for daily / broken / weekly
│   │   ├── jobs/
│   │   │   ├── scheduler.js        # registers and runs all jobs
│   │   │   ├── ingest.job.js
│   │   │   ├── dayClose.job.js
│   │   │   ├── poster.job.js
│   │   │   └── weeklySummary.job.js   # P1
│   │   ├── validators/
│   │   │   ├── me.schema.js
│   │   │   └── profile.schema.js
│   │   └── utils/
│   │       ├── time.js             # timezone helpers (Luxon)
│   │       ├── crypto.js           # encrypt/decrypt stored tokens
│   │       ├── retry.js            # backoff helper
│   │       └── httpError.js
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── streak.service.test.js   # highest priority
│   │   │   ├── time.test.js             # DST, week boundaries
│   │   │   └── templates.test.js
│   │   ├── integration/
│   │   │   ├── profile.routes.test.js
│   │   │   └── dayClose.job.test.js
│   │   └── fixtures/
│   │       └── commits.json
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json