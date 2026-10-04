// A quick "does the whole app start up?" test. It loads every part of the
// server (routes, controllers, services, jobs) and asks a few simple
// questions over real HTTP. No database or internet connection is needed.
// This is what catches a missing file, a wrong import name, or a bad setting.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Fake settings, applied BEFORE the app loads, because the app checks its
// settings the moment it is loaded. They deliberately replace whatever is in
// your real environment, so this test can never touch real accounts.
Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4000',
  MONGO_URI: 'mongodb://127.0.0.1:27017/ship-log-test',
  CLIENT_URL: 'http://localhost:5173',
  GITHUB_CLIENT_ID: 'test-client-id',
  GITHUB_CLIENT_SECRET: 'test-client-secret',
  JWT_SECRET: 'a'.repeat(32),
  TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
  INTERNAL_JOB_SECRET: 'b'.repeat(16),
  ADMIN_ALERT_WEBHOOK: '',
  RUN_SCHEDULER: 'false',
});

// import() instead of a normal import line, so it runs AFTER the settings above.
const { app } = await import('../../src/app.js');
// Loading the scheduler loads every job and every service behind it (posting,
// share card, day closing...). Nothing is started by loading.
await import('../../src/jobs/scheduler.js');

let server;
let base;

before(async () => {
  // Port 0 means "pick any free port", so this never clashes with your real server.
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.(); // don't wait for idle connections
  await new Promise((resolve) => server.close(resolve));
});

test('GET /health answers ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.database, 'disconnected'); // there is no database in tests
});

test('a logged-in-only route refuses visitors with a clear JSON error', async () => {
  const res = await fetch(`${base}/api/me`);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.message, 'Not logged in');
});

test('an unknown API address answers with a JSON 404', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.ok((await res.json()).error.message.includes('Route not found'));
});

test('a badly formed username is rejected before any database lookup', async () => {
  const res = await fetch(`${base}/api/u/bad_name`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.message, 'User not found');
});

test('the badge route answers with an image even for an unknown user', async () => {
  const res = await fetch(`${base}/badge/bad_name/streak.svg`);
  assert.equal(res.status, 404);
  assert.ok(res.headers.get('content-type').includes('image/svg+xml'));
  assert.ok((await res.text()).includes('not found'));
});