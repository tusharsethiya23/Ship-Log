// What a valid "connect Discord / Bluesky" request looks like.
// Leaving a field out means "don't change it". An empty string "" means
// "disconnect".

import { z } from 'zod';

// SECURITY: our server sends requests to this address, so we only accept real
// Discord webhook addresses. Without this check, a user could make our server
// call any address on the internet (or inside our own network).
const DISCORD_WEBHOOK = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;

// Handles look like name.bsky.social or a custom domain like name.example.com.
const BLUESKY_HANDLE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/;

// App passwords look like abcd-efgh-ijkl-mnop.
const APP_PASSWORD = /^[a-z0-9]{4}(-[a-z0-9]{4}){3}$/i;

export const saveIntegrationsSchema = z
  .object({
    discordWebhook: z
      .string()
      .trim()
      .refine((v) => v === '' || DISCORD_WEBHOOK.test(v), 'not a valid Discord webhook URL')
      .optional(),

    blueskyHandle: z
      .string()
      .trim()
      // People often type "@name.bsky.social". Remove the @ and lowercase it.
      .transform((v) => v.replace(/^@/, '').toLowerCase())
      .refine((v) => v === '' || BLUESKY_HANDLE.test(v), 'not a valid Bluesky handle')
      .optional(),

    blueskyAppPassword: z
      .string()
      .trim()
      .refine((v) => v === '' || APP_PASSWORD.test(v), 'app password should look like abcd-efgh-ijkl-mnop')
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'send at least one field');