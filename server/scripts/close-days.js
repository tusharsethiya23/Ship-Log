// Usage (from the project root):
//   npm run close-days --workspace server -- <username> [ISO time to pretend it is]
//
// Examples:
//   npm run close-days --workspace server -- yourusername
//   npm run close-days --workspace server -- yourusername 2026-10-03T12:00:00Z

import { connectDB, disconnectDB } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';
import { User } from '../src/models/User.js';
import { closeDaysForUser } from '../src/services/dayClose.service.js';

const [username, nowArg] = process.argv.slice(2);

if (!username) {
  console.error('Usage: npm run close-days --workspace server -- <username> [ISO time]');
  process.exit(1);
}

const now = nowArg ? new Date(nowArg) : new Date();
if (Number.isNaN(now.getTime())) {
  console.error(`"${nowArg}" is not a valid time. Example: 2026-10-03T12:00:00Z`);
  process.exit(1);
}

try {
  await connectDB();
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) throw new Error(`No user named "${username}"`);

  console.log(`Closing days for ${user.username} as if it were ${now.toISOString()}`);
  const result = await closeDaysForUser(user._id, now);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  logger.error('close-days failed', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}