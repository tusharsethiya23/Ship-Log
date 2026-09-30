// Calls for connecting Discord and Bluesky.

import { http } from './http.js';

export const getIntegrations = () => http('/api/me/integrations');

// e.g. saveIntegrations({ discordWebhook: 'https://discord.com/api/webhooks/...' })
// or   saveIntegrations({ blueskyHandle: 'me.bsky.social', blueskyAppPassword: 'abcd-efgh-ijkl-mnop' })
// An empty string disconnects: saveIntegrations({ discordWebhook: '' })
export const saveIntegrations = (changes) => http('/api/me/integrations', { method: 'PATCH', body: changes });

export const testIntegrations = () => http('/api/me/integrations/test', { method: 'POST' });