// Finds imports whose capitalization does not match the real file name.
// Windows ignores capital letters in file names, but Linux (what Render runs)
// does not, so a mismatch works on your computer and crashes when deployed.
//
// Usage (from the project root):
//   node server/scripts/check-imports.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The project root is two folders above this script (server/scripts).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The folders that contain our source code.
const FOLDERS = ['server/src', 'server/scripts', 'server/tests', 'client/src'];

// Matches:  from './x.js'   import('./x.js')   import './x.css'
const IMPORT_PATTERN = /(?:from\s+|import\s+(?:\(|))['"]([^'"]+)['"]/g;

// Lists every .js and .jsx file under a folder.
function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(full));
    else if (/\.jsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

// Walks the path one piece at a time and compares each piece with what is
// really in that folder, letter case included.
function checkExactCase(fullPath) {
  let current = ROOT;
  for (const part of path.relative(ROOT, fullPath).split(path.sep)) {
    const entries = fs.readdirSync(current);
    if (!entries.includes(part)) {
      const similar = entries.find((name) => name.toLowerCase() === part.toLowerCase());
      return similar ? `on disk it is "${similar}"` : 'file not found';
    }
    current = path.join(current, part);
  }
  return null; // everything matches
}

let problems = 0;
let checked = 0;

for (const folder of FOLDERS) {
  const dir = path.join(ROOT, folder);
  if (!fs.existsSync(dir)) continue;

  for (const file of listSourceFiles(dir)) {
    const text = fs.readFileSync(file, 'utf8');

    for (const match of text.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue; // packages like "express" are not our files

      checked += 1;
      const problem = checkExactCase(path.resolve(path.dirname(file), specifier));
      if (problem) {
        problems += 1;
        const line = text.slice(0, match.index).split('\n').length;
        console.log(`${path.relative(ROOT, file)}:${line}\n  imports "${specifier}" but ${problem}\n`);
      }
    }
  }
}

console.log(problems === 0 ? `All ${checked} imports match the real file names.` : `${problems} problem(s) found.`);
process.exitCode = problems === 0 ? 0 : 1;