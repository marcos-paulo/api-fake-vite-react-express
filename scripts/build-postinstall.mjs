import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runTsup } from './lib/run-tools.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'dist', 'scripts');

const ENTRIES = ['src/postinstall/postinstall-add-script.ts', 'src/postinstall/download-puppeteer.ts'];

function buildEntries() {
  runTsup(rootDir, [
    ...ENTRIES,
    '--format',
    'esm',
    '--out-dir',
    'dist/scripts',
    '--tsconfig',
    'tsconfig.pack-postinstall.json',
  ]);
}

function renameOutputsToMjs() {
  for (const entry of ENTRIES) {
    const baseName = path.basename(entry, '.ts');
    fs.renameSync(path.join(outDir, `${baseName}.js`), path.join(outDir, `${baseName}.mjs`));
  }
}

function main() {
  buildEntries();
  renameOutputsToMjs();
}

main();
