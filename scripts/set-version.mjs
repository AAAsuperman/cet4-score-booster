#!/usr/bin/env node
/* Update cache-busting version strings from the single VERSION file.
 * Usage: node scripts/set-version.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('VERSION must look like 5.12.0');
  process.exit(1);
}
const files = ['index.html', 'docs/index.html', '启动四级提分台.bat'];
for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/(\?v=)[^"'\s]+/g, `$1${version}`);
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    console.log(`updated ${rel} -> ${version}`);
  } else {
    console.log(`unchanged ${rel}`);
  }
}
