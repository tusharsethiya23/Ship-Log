// Connecting and disconnecting Discord and Bluesky, and testing them.

import { User } from '../models/User.js';
import { encrypt } from '../utils/crypto.js';
import { HttpError } from '../utils/httpError.js';
import { SECRET_FIELDS, checkPlatform, connectedPlatforms } from '../services/posting/index.js';

// Loads the user WITH the hidden secret fields.
function loadWithSecrets(userId) {
  return User.findById(userId).select(SECRET_FIELDS);
}

// What we tell the browser. Only yes/no flags and the public handle:
// the webhook and the app password are never sent back.
function toStatus(user) {
  const platforms = connectedPlatforms(user);
  return {
    discordConnected: platforms.includes('discord'),
    blueskyConnected: platforms.includes('bluesky'),
    blueskyHandle: user.integrations?.bluesky?.handle ?? '',
  };
}

// GET /api/me/integrations
export async function getIntegrations(req, res) {
  const user = await loadWithSecrets(req.user._id);
  res.json(toStatus(user));
}

// PATCH /api/me/integrations
export async function saveIntegrations(req, res) {
  const user = await loadWithSecrets(req.user._id);
  const { discordWebhook, blueskyHandle, blueskyAppPassword } = req.body;

  // Discord: a new URL replaces the old one, "" disconnects.
  if (discordWebhook !== undefined) {
    user.integrations.discordWebhookEncrypted = discordWebhook === '' ? '' : encrypt(discordWebhook);
  }

  // Bluesky: an empty handle disconnects (and forgets the password too).
  if (blueskyHandle === '') {
    user.integrations.bluesky.handle = '';
    user.integrations.bluesky.appPasswordEncrypted = '';
  } else {
    if (blueskyHandle !== undefined) user.integrations.bluesky.handle = blueskyHandle;
    if (blueskyAppPassword) user.integrations.bluesky.appPasswordEncrypted = encrypt(blueskyAppPassword);
  }

  // Bluesky needs both parts, or neither.
  const hasHandle = Boolean(user.integrations.bluesky.handle);
  const hasPassword = Boolean(user.integrations.bluesky.appPasswordEncrypted);
  if (hasHandle && !hasPassword) throw new HttpError(400, 'Enter your Bluesky app password too');
  if (hasPassword && !hasHandle) throw new HttpError(400, 'Enter your Bluesky handle too');

  await user.save();
  res.json(toStatus(user));
}

// Remembers when each user last pressed Test, to stop spamming Discord/Bluesky.
const lastTest = new Map();
const COOLDOWN_MS = 15_000;

// POST /api/me/integrations/test
export async function testIntegrations(req, res) {
  const key = String(req.user._id);
  if (Date.now() - (lastTest.get(key) ?? 0) < COOLDOWN_MS) {
    throw new HttpError(429, 'Please wait a few seconds before testing again.');
  }
  lastTest.set(key, Date.now());

  const user = await loadWithSecrets(req.user._id);
  const platforms = connectedPlatforms(user);
  if (platforms.length === 0) throw new HttpError(400, 'Connect Discord or Bluesky first.');

  // Test each platform separately so one failure doesn't hide the other result.
  const results = [];
  for (const platform of platforms) {
    try {
      results.push({ platform, ok: true, message: await checkPlatform(platform, user) });
    } catch (err) {
      results.push({ platform, ok: false, message: err.message });
    }
  }
  res.json({ results });
}