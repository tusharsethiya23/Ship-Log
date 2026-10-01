// Usage (from the project root):
//   npm run test-alert --workspace server
// Sends one test alert so you can check ADMIN_ALERT_WEBHOOK works.

import { env } from '../src/config/env.js';
import { alertAdmin } from '../src/services/alert.service.js';

if (!env.ADMIN_ALERT_WEBHOOK) {
  console.error('ADMIN_ALERT_WEBHOOK is empty in server/.env, so alerts are switched off.');
  process.exit(1);
}

await alertAdmin('test', 'This is a test alert. If you can read this, alerts work ✅');
console.log('Test alert sent. Check your Discord channel.');