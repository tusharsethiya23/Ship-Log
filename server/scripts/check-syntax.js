// Usage (from the project root):
//   node server/scripts/check-syntax.js
//
// Asks Node to read every backend file WITHOUT running it, and reports any
// syntax mistake: a name declared twice, a missing bracket, a pasted-twice
// file. These are the mistakes that make the server crash the moment it starts.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The server folder is one level above this script (server/scripts).
const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = ['src', 'scripts', 'tests'];

// Lists every .js file under a folder.
function listJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listJsFiles(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

let checked = 0;
let problems = 0;

for (const folder of FOLDERS) {
  const dir = path.join(SERVER_DIR, folder);
  if (!fs.existsSync(dir)) continue;

  for (const file of listJsFiles(dir)) {
    checked += 1;
    // process.execPath is the node program running this script. `--check`
    // makes it parse the file and stop, without executing anything.
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      problems += 1;
      console.log(`SYNTAX PROBLEM in ${path.relative(SERVER_DIR, file)}\n${result.stderr}\n`);
    }
  }
}

console.log(problems === 0 ? `All ${checked} backend files parse correctly.` : `${problems} file(s) with problems.`);
process.exitCode = problems === 0 ? 0 : 1;