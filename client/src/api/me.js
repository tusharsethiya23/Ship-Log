// Calls for the logged-in user's own data and actions.

import { http } from './http.js';

export const getMe = () => http('/api/me');

// Saves settings. Send only what changed or everything, e.g.
// updateMe({ timezone: 'Asia/Kolkata', dayCutoffHour: 3, repos: [...] })
export const updateMe = (changes) => http('/api/me', { method: 'PATCH', body: changes });

// The repos the user can pick from: { repos: ['owner/name', ...] }
export const getGithubRepos = () => http('/api/me/github-repos');

export const syncNow = () => http('/api/sync', { method: 'POST' });
export const claimRestDay = () => http('/api/rest-day', { method: 'POST' });
export const cancelRestDay = () => http('/api/rest-day', { method: 'DELETE' });
export const logout = () => http('/auth/logout', { method: 'POST' });

// Erases the account and all its data. The username is sent as confirmation.
export const deleteAccount = (confirmUsername) => http('/api/me', { method: 'DELETE', body: { confirmUsername } });