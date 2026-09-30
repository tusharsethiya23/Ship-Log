// Every run: close any finished days for every user.

import { User } from '../models/User.js';
import { closeDaysForUser } from '../services/dayClose.service.js';
import { logger } from '../config/logger.js';

export async function runDayCloseJob() {
  const users = await User.find({}).select('_id username').lean();

  let daysClosed = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const { closed } = await closeDaysForUser(user._id);
      daysClosed += closed.length;
      for (const day of closed) {
        logger.info(`Closed ${day.date} for ${user.username}`, {
          status: day.status,
          streakAfter: day.streakAfter,
          broken: day.broken,
        });
      }
    } catch (err) {
      // Usually GitHub trouble or an expired token. The day stays open and
      // the next run tries again.
      failed += 1;
      logger.warn(`Day close failed for ${user.username}`, err);
    }
  }

  if (daysClosed > 0 || failed > 0) {
    logger.info('Day close job finished', { daysClosed, failed });
  }
}