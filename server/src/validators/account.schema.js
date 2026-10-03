// What a valid "delete my account" request looks like. The user must send
// their username, as proof that this is deliberate.

import { z } from 'zod';

export const deleteAccountSchema = z
  .object({
    confirmUsername: z.string().trim().min(1, 'type your username to confirm'),
  })
  .strict();