#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const workDir = process.cwd();

console.log('🚀 Iniciando api-fake com Puppeteer...');

const child = spawn('npm', ['run', 'dev:with:puppeteer'], {
  cwd: pkgRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, API_FAKE_WORKDIR: workDir },
});

child.on('exit', (code) => process.exit(code ?? 0));
