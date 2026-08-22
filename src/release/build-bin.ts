import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runTsup } from './run-tools';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(rootDir, 'dist', 'bin');

const ENTRIES = ['src/boot/bin/api-fake-prod.ts', 'src/boot/bin/api-fake-init.ts'];

function buildEntries() {
  runTsup(rootDir, [
    ...ENTRIES,
    '--format',
    'esm',
    '--out-dir',
    'dist/bin',
    '--tsconfig',
    'tsconfig.pack-bin.json',
  ]);
}

function renameOutputsToMjs() {
  for (const entry of ENTRIES) {
    const baseName = path.basename(entry, '.ts');
    fs.renameSync(path.join(outDir, `${baseName}.js`), path.join(outDir, `${baseName}.mjs`));
  }
}

function ensureShebangAndExecPermission() {
  for (const entry of ENTRIES) {
    const baseName = path.basename(entry, '.ts');
    const finalMjsPath = path.join(outDir, `${baseName}.mjs`);
    const source = fs.readFileSync(finalMjsPath, 'utf8');
    const shebang = '#!/usr/bin/env node\n';
    const output = source.startsWith(shebang) ? source : shebang + source;

    fs.writeFileSync(finalMjsPath, output);
    fs.chmodSync(finalMjsPath, 0o755);
  }
}

function main() {
  buildEntries();
  renameOutputsToMjs();
  ensureShebangAndExecPermission();
}

main();
