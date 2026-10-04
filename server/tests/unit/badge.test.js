// Tests for the badge. Run with: npm test --workspace server

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeBadge, escapeXml, renderBadge } from '../../src/services/badge.service.js';

// A minimal profile, shaped like the real one.
function profile({ current = 0, todayStatus = 'none', atRisk = false } = {}) {
  return { streak: { current }, todayStatus, atRisk };
}

test('escapeXml makes special characters safe', () => {
  assert.equal(escapeXml('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
});

test('renderBadge escapes text so it cannot break the image', () => {
  const svg = renderBadge({ label: 'a<b', value: '1 & 2', color: '#16a34a' });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('a&lt;b'));
  assert.ok(svg.includes('1 &amp; 2'));
  assert.ok(!svg.includes('a<b'));
});

test('a running streak is green and uses the right word', () => {
  assert.deepEqual(describeBadge(profile({ current: 1, todayStatus: 'active' })), { value: '1 day', color: '#16a34a' });
  assert.equal(describeBadge(profile({ current: 12, todayStatus: 'active' })).value, '12 days');
});

test('no streak is grey', () => {
  assert.deepEqual(describeBadge(profile()), { value: 'no streak yet', color: '#6b7280' });
});

test('a streak at risk is orange, and a rest day is blue', () => {
  assert.equal(describeBadge(profile({ current: 5, atRisk: true })).color, '#d97706');
  assert.equal(describeBadge(profile({ current: 5, todayStatus: 'rest' })).color, '#3b82f6');
});