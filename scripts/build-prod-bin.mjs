import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runTsup } from './lib/run-tools.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const compiledJsPath = path.join(rootDir, 'dist', 'bin', 'api-fake-prod.js');
const finalMjsPath = path.join(rootDir, 'dist', 'bin', 'api-fake-prod.mjs');

function buildEntry() {
  runTsup(rootDir, [
    'src/bin/api-fake-prod.ts',
    '--format',
    'esm',
    '--out-dir',
    'dist/bin',
    '--tsconfig',
    'tsconfig.pack-bin.json',
  ]);
}

function renameOutputToMjs() {
  fs.renameSync(compiledJsPath, finalMjsPath);
}

function ensureShebangAndExecPermission() {
  const source = fs.readFileSync(finalMjsPath, 'utf8');
  const shebang = '#!/usr/bin/env node\n';
  const output = source.startsWith(shebang) ? source : shebang + source;

  fs.writeFileSync(finalMjsPath, output);
  fs.chmodSync(finalMjsPath, 0o755);
}

function main() {
  buildEntry();
  renameOutputToMjs();
  ensureShebangAndExecPermission();
}

main();
