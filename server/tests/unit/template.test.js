// Tests for the post text. Run with: npm test --workspace server

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPostText } from '../../src/services/posting/templates.js';

const url = 'https://example.dev/u/tushar';

test('an active day says which day of the streak it is', () => {
  const text = buildPostText({ type: 'daily', status: 'active', streakAfter: 23, commitCount: 5, brokenStreakLength: 0, url });
  assert.ok(text.startsWith('Day 23'));
  assert.ok(text.includes('5 commits'));
  assert.ok(text.endsWith(url));
});

test('one commit is written in the singular', () => {
  const text = buildPostText({ type: 'daily', status: 'active', streakAfter: 1, commitCount: 1, brokenStreakLength: 0, url });
  assert.ok(text.includes('1 commit)'));
});

test('a rest day says the streak holds', () => {
  const text = buildPostText({ type: 'daily', status: 'rest', streakAfter: 7, commitCount: 0, brokenStreakLength: 0, url });
  assert.ok(text.startsWith('Rest day'));
  assert.ok(text.includes('7 days'));
});

test('a broken streak post mentions how long it was', () => {
  const text = buildPostText({ type: 'broken', status: 'missed', streakAfter: 0, commitCount: 0, brokenStreakLength: 12, url });
  assert.ok(text.startsWith('Streak broken'));
  assert.ok(text.includes('12 days'));
});

test('posts stay under the 300 character Bluesky limit', () => {
  const text = buildPostText({ type: 'broken', status: 'missed', streakAfter: 0, commitCount: 0, brokenStreakLength: 365, url });
  assert.ok(text.length < 300);
});