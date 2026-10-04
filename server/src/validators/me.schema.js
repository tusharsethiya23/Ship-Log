// Describes what a valid "update my settings" request looks like.
// Anything that doesn't match is rejected with a 400 before our code runs.

import { z } from 'zod';
import { isValidTimezone } from '../utils/time.js';

// One tracked repo: "owner/name" (letters, numbers, dots, dashes, underscores).
const repoSchema = z.object({
  fullName: z
    .string()
    .trim()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'must look like owner/repo'),
  isPrivate: z.boolean().optional(),
});

export const updateMeSchema = z
  .object({
    timezone: z.string().refine(isValidTimezone, 'unknown timezone').optional(),
    dayCutoffHour: z.number().int().min(0).max(23).optional(),
    repos: z.array(repoSchema).max(10, 'track at most 10 repos').optional(),
    // Added in Step 22: the opt-in "also count my private activity" checkbox.
    countPrivateActivity: z.boolean().optional(),
  })
  // .strict() rejects unknown fields, so nobody can sneak in something like
  // githubId or username through this route.
  .strict()
  // An empty request ({}) changes nothing, so treat it as a mistake.
  .refine((data) => Object.keys(data).length > 0, 'send at least one field to update');