#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const workDir = process.cwd();
const electronMain = path.join(pkgRoot, 'dist', 'electron', 'main.js');

const isFirstRun = !fs.existsSync(electronMain);

if (isFirstRun) {
  console.log('🔨 Primeira execução: compilando Electron...');
  execSync('npm run build:electron', { cwd: pkgRoot, stdio: 'inherit' });
}

console.log('🚀 Iniciando api-fake com Electron...');
const child = spawn('npm', ['run', 'dev:with:electron'], {
  cwd: pkgRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, API_FAKE_WORKDIR: workDir },
});

child.on('exit', (code) => process.exit(code ?? 0));
