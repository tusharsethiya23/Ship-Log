// One entry point for posting. Other code says "send this text to discord"
// and doesn't need to know how each platform works.
// Adding X or Mastodon later means adding one file here and one branch below.

import { env } from '../../config/env.js';
import { decrypt } from '../../utils/crypto.js';
import { PostError } from './postError.js';
import { sendDiscord } from './discord.js';
import { sendBluesky, verifyBluesky } from './bluesky.js';

// The stored secrets are hidden from normal queries (select: false). Adding
// this to a query's .select() brings them back. The Bluesky handle is not
// secret, so it is always available.
export const SECRET_FIELDS =
  '+integrations.discordWebhookEncrypted +integrations.bluesky.appPasswordEncrypted';

// The user's public page, used as the link inside posts.
export function profileUrl(username) {
  return `${env.CLIENT_URL}/u/${username}`;
}

// Which platforms is this user fully connected to?
// (The user object must have been loaded with SECRET_FIELDS.)
export function connectedPlatforms(user) {
  const platforms = [];
  if (user.integrations?.discordWebhookEncrypted) platforms.push('discord');
  if (user.integrations?.bluesky?.handle && user.integrations?.bluesky?.appPasswordEncrypted) {
    platforms.push('bluesky');
  }
  return platforms;
}

// Publishes `text` on one platform. Throws a PostError if it fails.
export async function sendPost(platform, user, text) {
  if (platform === 'discord') {
    return sendDiscord(decrypt(user.integrations.discordWebhookEncrypted), text);
  }
  if (platform === 'bluesky') {
    return sendBluesky(
      {
        handle: user.integrations.bluesky.handle,
        appPassword: decrypt(user.integrations.bluesky.appPasswordEncrypted),
      },
      text,
      profileUrl(user.username)
    );
  }
  throw new PostError(`Unknown platform: ${platform}`, { permanent: true });
}

// The "Test" button. Discord gets a real (private-channel) message. Bluesky
// only checks the login, so testing never publishes a public post.
export async function checkPlatform(platform, user) {
  if (platform === 'discord') {
    await sendPost('discord', user, 'Ship Log test message ✅ Your streak posts will show up here.');
    return 'Test message sent to your Discord channel';
  }
  if (platform === 'bluesky') {
    await verifyBluesky({
      handle: user.integrations.bluesky.handle,
      appPassword: decrypt(user.integrations.bluesky.appPasswordEncrypted),
    });
    return 'Logged in to Bluesky successfully';
  }
  throw new PostError(`Unknown platform: ${platform}`, { permanent: true });
}