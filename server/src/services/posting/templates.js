// Builds the text of each automatic post. Pure functions (no database, no
// network), so they are easy to test and easy to reword later.
// Everything stays well under Bluesky's 300-character limit.

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// status:              'active' | 'rest' | 'missed' (the closed day's status)
// streakAfter:         streak length after that day
// commitCount:         commits found that day
// brokenStreakLength:  length of the lost streak (only for 'missed' days)
// url:                 the user's public profile link
export function buildPostText({ type, status, streakAfter, commitCount, brokenStreakLength, url }) {
  // The "streak broken" post.
  if (type === 'broken') {
    return `Streak broken 💔 My ${plural(brokenStreakLength, 'day')} streak is over. Starting again from day 1.\n${url}`;
  }

  // A rest day keeps the streak alive without adding to it.
  if (status === 'rest') {
    return `Rest day 😴 Streak holds at ${plural(streakAfter, 'day')}.\n${url}`;
  }

  // A normal active day.
  return `Day ${streakAfter} 🔥 Shipped code today (${plural(commitCount, 'commit')}).\n${url}`;
}