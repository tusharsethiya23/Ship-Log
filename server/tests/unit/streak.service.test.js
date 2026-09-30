// Tests for the streak rules. The calendar used in these tests:
//   Mon 2026-09-28, Tue 09-29, Wed 09-30, Thu 10-01 ... Sun 10-04, Mon 10-05

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDay, createEmptyStreak, rebuildStreak } from '../../src/services/streak.service.js';

// Small helpers so each test reads like a story.
const commit = (date) => ({ date, hadCommits: true, restClaimed: false });
const rest = (date) => ({ date, hadCommits: false, restClaimed: true });
const nothing = (date) => ({ date, hadCommits: false, restClaimed: false });

// Feeds several days in a row and returns the final state.
function run(days, start = createEmptyStreak()) {
  return days.reduce((state, day) => applyDay(state, day).state, start);
}

test('the first active day starts a streak', () => {
  const result = applyDay(createEmptyStreak(), commit('2026-09-28'));
  assert.equal(result.status, 'active');
  assert.equal(result.state.current, 1);
  assert.equal(result.state.longest, 1);
  assert.equal(result.state.totalActive, 1);
  assert.equal(result.state.lastActiveDate, '2026-09-28');
  assert.equal(result.broken, false);
});

test('consecutive active days build the streak', () => {
  const state = run([commit('2026-09-28'), commit('2026-09-29'), commit('2026-09-30')]);
  assert.equal(state.current, 3);
  assert.equal(state.totalActive, 3);
});

test('a missed day resets the streak and reports what was lost', () => {
  const before = run([commit('2026-09-28'), commit('2026-09-29'), commit('2026-09-30')]);
  const result = applyDay(before, nothing('2026-10-01'));
  assert.equal(result.status, 'missed');
  assert.equal(result.broken, true);
  assert.equal(result.brokenStreakLength, 3);
  assert.equal(result.state.current, 0);
  assert.equal(result.state.longest, 3); // the best streak is remembered
  assert.equal(result.state.totalActive, 3);
});

test('missing a day when there is no streak is not a "break"', () => {
  const result = applyDay(createEmptyStreak(), nothing('2026-09-28'));
  assert.equal(result.status, 'missed');
  assert.equal(result.broken, false);
});

test('a rest day keeps the streak but does not increase it', () => {
  const before = run([commit('2026-09-28'), commit('2026-09-29')]);
  const result = applyDay(before, rest('2026-09-30'));
  assert.equal(result.status, 'rest');
  assert.equal(result.state.current, 2);
  assert.equal(result.state.totalActive, 2);
  assert.equal(result.state.restUsedThisWeek, true);
  assert.equal(result.broken, false);
});

test('a second rest claim in the same week counts as missed', () => {
  const before = run([commit('2026-09-28'), commit('2026-09-29'), rest('2026-09-30')]);
  const result = applyDay(before, rest('2026-10-01'));
  assert.equal(result.status, 'missed');
  assert.equal(result.broken, true);
  assert.equal(result.brokenStreakLength, 2);
});

test('the rest day is available again in a new week', () => {
  // Rest was already used in the week starting Monday 09-28...
  const before = {
    ...createEmptyStreak(),
    current: 5,
    weekStart: '2026-09-28',
    restUsedThisWeek: true,
  };
  // ...but Monday 10-05 begins a new week, so resting is allowed again.
  const result = applyDay(before, rest('2026-10-05'));
  assert.equal(result.status, 'rest');
  assert.equal(result.state.current, 5);
  assert.equal(result.state.weekStart, '2026-10-05');
});

test('commits on a claimed rest day count as active and keep the rest day', () => {
  const result = applyDay(createEmptyStreak(), { date: '2026-09-30', hadCommits: true, restClaimed: true });
  assert.equal(result.status, 'active');
  assert.equal(result.state.restUsedThisWeek, false);
});

test('applyDay never modifies the state it receives', () => {
  const before = Object.freeze(createEmptyStreak());
  // ES modules run in strict mode, so changing a frozen object would throw.
  assert.doesNotThrow(() => applyDay(before, commit('2026-09-28')));
  assert.equal(before.current, 0);
});

test('rebuildStreak matches the result of replaying every day', () => {
  // Deliberately out of order, and 09-30 is missing (it should count as missed).
  const days = [
    { date: '2026-10-01', status: 'active' },
    { date: '2026-09-28', status: 'active' },
    { date: '2026-09-29', status: 'active' },
  ];
  const state = rebuildStreak(days);
  assert.equal(state.current, 1); // reset by the missing 09-30, then 10-01 restarted it
  assert.equal(state.longest, 2);
  assert.equal(state.totalActive, 3);
  assert.equal(state.lastActiveDate, '2026-10-01');
});