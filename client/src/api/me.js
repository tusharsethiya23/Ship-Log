// Calls for the logged-in user's own data and actions.

import { http } from './http.js';

export const getMe = () => http('/api/me');
export const syncNow = () => http('/api/sync', { method: 'POST' });
export const claimRestDay = () => http('/api/rest-day', { method: 'POST' });
export const logout = () => http('/auth/logout', { method: 'POST' });