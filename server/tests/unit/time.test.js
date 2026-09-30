// Tests for the date helpers. Run with: npm test --workspace server

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  daysBetween,
  getWeekStart,
  parseDateString,
  getTodayString,
  isValidTimezone,
  getDayWindow,
} from '../../src/utils/time.js';

test('getWeekStart returns the Monday of the week', () => {
  assert.equal(getWeekStart('2026-09-28'), '2026-09-28'); // a Monday
  assert.equal(getWeekStart('2026-09-29'), '2026-09-28'); // Tuesday
  assert.equal(getWeekStart('2026-10-04'), '2026-09-28'); // Sunday: last day of that week
  assert.equal(getWeekStart('2026-10-05'), '2026-10-05'); // the next Monday starts a new week
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28'); // 2026 is not a leap year
});

test('daysBetween counts in both directions', () => {
  assert.equal(daysBetween('2026-09-28', '2026-10-05'), 7);
  assert.equal(daysBetween('2026-10-05', '2026-09-28'), -7);
  assert.equal(daysBetween('2026-09-28', '2026-09-28'), 0);
});

test('parseDateString rejects invalid dates', () => {
  assert.throws(() => parseDateString('hello'));
  assert.throws(() => parseDateString('2026-02-31')); // February has no 31st
  assert.throws(() => parseDateString('2026-9-29')); // wrong format
});

test('getTodayString uses the user timezone', () => {
  // 20:00 UTC on Sept 29 is 01:30 on Sept 30 in India (UTC+5:30).
  const moment = new Date('2026-09-29T20:00:00Z');
  assert.equal(getTodayString('UTC', 0, moment), '2026-09-29');
  assert.equal(getTodayString('Asia/Kolkata', 0, moment), '2026-09-30');
});

test('getTodayString respects the day cutoff hour', () => {
  const moment = new Date('2026-09-29T20:00:00Z'); // 01:30 on Sept 30 in India
  // With a 3 a.m. cutoff, 01:30 still belongs to Sept 29.
  assert.equal(getTodayString('Asia/Kolkata', 3, moment), '2026-09-29');
});

test('isValidTimezone accepts real zones and rejects fake ones', () => {
  assert.equal(isValidTimezone('Asia/Kolkata'), true);
  assert.equal(isValidTimezone('Mars/Base'), false);
});

test('getDayWindow returns the exact span of a day', () => {
  const utc = getDayWindow('2026-09-29', 'UTC', 0);
  assert.equal(utc.start.toISOString(), '2026-09-29T00:00:00.000Z');
  assert.equal(utc.end.toISOString(), '2026-09-30T00:00:00.000Z');

  // India is UTC+5:30, so its Sept 29 begins at 18:30 UTC on Sept 28.
  const india = getDayWindow('2026-09-29', 'Asia/Kolkata', 0);
  assert.equal(india.start.toISOString(), '2026-09-28T18:30:00.000Z');
  assert.equal(india.end.toISOString(), '2026-09-29T18:30:00.000Z');
});

test('getDayWindow shifts by the cutoff hour', () => {
  const india = getDayWindow('2026-09-29', 'Asia/Kolkata', 3);
  assert.equal(india.start.toISOString(), '2026-09-28T21:30:00.000Z');
  assert.equal(india.end.toISOString(), '2026-09-29T21:30:00.000Z');
});

test('getDayWindow and getTodayString agree on where a day begins and ends', () => {
  const { start, end } = getDayWindow('2026-09-30', 'Asia/Kolkata', 3);
  // The first moment of the window belongs to Sept 30...
  assert.equal(getTodayString('Asia/Kolkata', 3, start), '2026-09-30');
  // ...the moment just before it belongs to Sept 29...
  assert.equal(getTodayString('Asia/Kolkata', 3, new Date(start.getTime() - 1)), '2026-09-29');
  // ...and the last moment before the window ends is still Sept 30.
  assert.equal(getTodayString('Asia/Kolkata', 3, new Date(end.getTime() - 1)), '2026-09-30');
});