// A tiny logger used everywhere instead of console.log.
// Why bother? Log levels let us hide noisy debug messages in production,
// and timestamps + structure make problems much easier to trace later
// (especially for background jobs that run while nobody is watching).

import { isProduction } from './env.js';

// Numeric "severity" so we can compare levels: higher = more important.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// In production we skip debug messages. In development we show everything.
const minLevel = isProduction ? LEVELS.info : LEVELS.debug;

// Turns whatever the caller passed as extra info into a plain object.
// Error objects don't serialize well to JSON, so we pull out message + stack.
function formatMeta(meta) {
  if (meta instanceof Error) {
    return { error: meta.message, stack: meta.stack };
  }
  return meta ?? {}; // `??` = use {} only if meta is null/undefined
}

function log(level, message, meta) {
  // Ignore messages below the minimum level (e.g. debug in production).
  if (LEVELS[level] < minLevel) return;

  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...formatMeta(meta), // spread the extra info into the same object
  };

  // Errors go to stderr, everything else to stdout.
  const output = level === 'error' ? console.error : console.log;

  if (isProduction) {
    // One JSON object per line: easy for hosting dashboards to search/filter.
    output(JSON.stringify(entry));
  } else {
    // Human-friendly line for your terminal while developing.
    const { time, level: lvl, message: msg, ...rest } = entry;
    const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
    output(`${time} [${lvl.toUpperCase()}] ${msg}${extra}`);
  }
}

// The public API: logger.info('text'), logger.error('text', errorOrObject)
export const logger = {
  debug: (message, meta) => log('debug', message, meta),
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};