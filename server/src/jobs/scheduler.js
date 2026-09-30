// Runs our jobs on a timer inside the worker process.

import { runDayCloseJob } from './dayClose.job.js';
import { runIngestJob } from './ingest.job.js';
import { logger } from '../config/logger.js';

const timers = [];

// Runs `job` now, then again every `intervalMs` milliseconds.
function every(name, intervalMs, job) {
  // If a run takes longer than the interval, skip the next one instead of
  // letting two runs overlap and work on the same users at once.
  let running = false;

  const run = async () => {
    if (running) {
      logger.warn(`${name} is still running, skipping this round`);
      return;
    }
    running = true;
    try {
      await job();
    } catch (err) {
      // A crashing job must not kill the worker.
      logger.error(`${name} crashed`, err);
    } finally {
      running = false;
    }
  };

  run(); // first run right away
  timers.push(setInterval(run, intervalMs));
}

export function startScheduler() {
  every('dayClose', 5 * 60 * 1000, runDayCloseJob); // every 5 minutes
  every('ingest', 15 * 60 * 1000, runIngestJob); // every 15 minutes
}

export function stopScheduler() {
  timers.forEach(clearInterval);
  timers.length = 0;
}