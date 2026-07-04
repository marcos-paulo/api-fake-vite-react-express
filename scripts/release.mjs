import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { runNodeScript, runNpmScript } from './lib/run-tools.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = path.join(rootDir, 'dist-package');
const distTargetDir = path.join(rootDir, 'dist-target');

function cleanDist() {
  for (const dir of ['dist', 'dist-package', 'dist-target']) {
    fs.rmSync(path.join(rootDir, dir), { recursive: true, force: true });
  }
}

function buildAll() {
  runNpmScript(rootDir, 'build');
}

function preparePackage() {
  runNodeScript(rootDir, 'scripts/prepare-release-package.mjs');
}

function packTarball() {
  fs.mkdirSync(distTargetDir, { recursive: true });
  execFileSync('npm', ['pack', '--pack-destination', distTargetDir], {
    cwd: packageDir,
    stdio: 'inherit',
  });
}

function main() {
  cleanDist();
  buildAll();
  preparePackage();
  packTarball();
}

main();
