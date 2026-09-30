// Calls for the PUBLIC profile routes (no login needed).

import { http } from './http.js';

export function getProfile(username) {
  return http(`/api/u/${encodeURIComponent(username)}`);
}

export function getCalendar(username, year) {
  return http(`/api/u/${encodeURIComponent(username)}/calendar?year=${year}`);
}