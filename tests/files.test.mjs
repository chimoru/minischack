// Kontrollerar att service workern (sw.js) sparar ALLA appens filer.
// Glöms en fil bort fungerar appen inte offline. Kör med:  node tests/files.test.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const listed = new Set([...readFileSync(join(root, 'sw.js'), 'utf8').matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]));

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [relative(root, p)];
  });
}
const needed = [...walk(join(root, 'js')), ...walk(join(root, 'css')),
  ...walk(join(root, 'icons')).filter((f) => f.endsWith('.png')),
  ...walk(join(root, 'fonts')).filter((f) => f.endsWith('.woff2')), 'index.html', 'manifest.webmanifest'];

const missing = needed.filter((f) => !listed.has(f));
const extra = [...listed].filter((f) => f !== './' && !needed.includes(f));
if (missing.length) console.log('❌ Saknas i sw.js:', missing.join(', '));
if (extra.length) console.log('❌ Finns i sw.js men inte på disk:', extra.join(', '));
if (!missing.length && !extra.length) console.log(`✅ sw.js sparar alla ${needed.length} filer`);
process.exit(missing.length || extra.length ? 1 : 0);
