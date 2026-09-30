Public Ship Log: PRD v0.2
1. What problem we are solving

Builders start side projects and quit quietly. Private habit trackers don't help because nobody sees you skip a day, so skipping costs nothing. Manually updating a tracker adds friction and that friction is often the first thing to slip.

Public Ship Log makes consistency visible and automatic. It detects the days you write code, keeps a public streak, and posts it for you. Missing a day is also visible, so quitting has a social cost.

2. Target users

Primary: solo developers and indie hackers working on a code-based side project who want external accountability.

Secondary:

Viewers: followers, friends, and potential collaborators who visit a public profile page or see a streak post.
Build-in-public communities (Discord servers, Bluesky) that use streaks as a shared accountability ritual.

Key user traits: already uses GitHub, is comfortable with public accountability, and wants zero-effort logging.

3. Features

P0 (MVP)

GitHub login (OAuth): identity and commit data source in one step.
Automatic day detection: a day counts if the user pushes at least one commit to their chosen repo(s). Days are calculated in the user's own timezone.
Streak engine: current streak, longest streak, total active days.
Rest day: one per week, claimed by the user, shown as a distinct marker. It keeps the streak alive without adding to the count. A second missed day in the same week breaks the streak.
Public profile page (/u/username): streak count, calendar heatmap, and a log of active days. Missed days appear as visible gaps.
Automatic daily post at end of the user's day to Bluesky and/or a Discord webhook, e.g. "Day 23 🔥".
Automatic broken-streak post when a streak resets.
Scheduler reliability: retries on failure and an alert to the admin (you) if a job fails.

P1

Share cards: Open Graph preview images so streak links look good when posted.
Evening reminder if nothing has been committed yet.
Optional one-line note per day, and opt-in display of repo names or commit messages.
Embeddable badge for READMEs.
Weekly summary post.

P2

Multiple projects per user, RSS feed, cheer reactions, X/Mastodon posting.

Tech approach: MERN (MongoDB, Express, React, Node) on an always-on host, with a timezone-aware scheduler that loops over all users.

4. Success criteria

Product outcomes

Your own streak: you reach and hold a 30-day streak using the tool (the real proof it works).
Reliability: 100% of daily posts publish without manual action, and any failure is alerted within an hour.
Accuracy: streak counts match actual commit history, including timezone and rest-day edge cases, with zero known miscounts.
Effort: a new user connects GitHub and goes live in under 3 minutes.

Adoption (set your own targets)

10 external users within the first month of public launch.
At least 50% of them are still active after 30 days.
The share of active users with an ongoing streak of 7+ days.

Quality bar

The public page loads in under 2 seconds.
No private repo data ever appears publicly.

5. What we are not building
Non-code work tracking. Writing, design, and research don't count in v1. The tool is GitHub-based.
Manual self-reporting streaks. No "trust me, I worked" button, so the streak stays honest.
Editing or deleting past entries, or backdating beyond a short window.
Team or organization accounts. Individual accounts only.
Time or hour tracking, or productivity analytics.
X/Twitter posting in v1, due to API cost and restrictions.
Social network features: comments, follower feeds, DMs, or leaderboards.
Private repo detail exposure. Only commit counts are used unless the user opts in to more.
Native mobile apps. A responsive web page is enough.
Paid plans or monetization.
Multiple rest days or a "freeze" store. Exactly one rest day per week.