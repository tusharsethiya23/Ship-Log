// Encrypts and decrypts small secrets (like a user's GitHub access token)
// before they are saved in MongoDB, so a database leak alone does not expose them.
// Uses AES-256-GCM, which also detects tampering: if the stored text is
// modified, decrypt() throws instead of returning garbage.

import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';

// TOKEN_ENCRYPTION_KEY is 64 hex characters = 32 bytes, which AES-256 needs.
const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex');
if (key.length !== 32) {
  throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (0-9, a-f)');
}

// Turns plain text into "iv.tag.ciphertext" (three base64 parts joined by dots).
export function encrypt(plainText) {
  // A fresh random IV (starting value) for every encryption, so the same
  // text never produces the same output twice. 12 bytes is standard for GCM.
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  // The auth tag is the tamper-proof seal, and it must be saved with the data.
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64')).join('.');
}

// Reverses encrypt(). Throws if the data was changed or the key is wrong.
export function decrypt(payload) {
  const [iv, tag, encrypted] = payload.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}