// This file is the single place where environment variables are read.
// Every other file imports `env` from here instead of touching process.env.
// If anything is missing or malformed, the app refuses to start with a
// clear message, instead of crashing mysteriously later.

import { z } from 'zod';

// A "schema" describes what valid configuration looks like.
const envSchema = z.object({
  // Only these three values are allowed. If not set, default to 'development'.
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // "true" makes the web server also run the scheduled jobs itself, so ONE
  // service does everything (used in production). Leave it unset on your own
  // computer, where you run the worker separately.
  RUN_SCHEDULER: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  // Env vars are ALWAYS strings ("4000", not 4000). z.coerce.number()
  // converts the string to a number, then we check it's a positive integer.
  PORT: z.coerce.number().int().positive().default(4000),

  // Must exist and not be empty.
  MONGO_URI: z.string().min(1),

  // Must be a valid URL (e.g. http://localhost:5173).
  CLIENT_URL: z.string().url(),

  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),

  // Reject weak secrets: at least 32 characters.
  JWT_SECRET: z.string().min(32),

  // 32 bytes written as hex = exactly 64 characters. AES-256 needs this length.
  TOKEN_ENCRYPTION_KEY: z.string().length(64),

  INTERNAL_JOB_SECRET: z.string().min(16),

  // Optional: either a valid URL or an empty string (meaning "alerts off").
  ADMIN_ALERT_WEBHOOK: z.string().url().or(z.literal('')).default(''),
});

// safeParse checks process.env against the schema WITHOUT throwing.
// It returns { success: true, data } or { success: false, error }.
const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  // Print one readable line per problem, e.g. "  - PORT: Expected number"
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  // Exit with a non-zero code so hosts/CI know the start failed.
  process.exit(1);
}

// Object.freeze makes the config read-only, so no code can accidentally
// change a setting while the app is running.
export const env = Object.freeze(result.data);

// Small convenience flags used across the app.
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';