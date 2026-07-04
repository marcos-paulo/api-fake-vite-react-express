#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const pkgRoot = path.resolve(__dirname, '..');
const workDir = process.cwd();

console.log('🚀 Iniciando api-fake com Puppeteer...');

const child = spawn('npm', ['run', 'bun:dev:with:puppeteer'], {
  cwd: pkgRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, API_FAKE_WORKDIR: workDir },
});

child.on('exit', (code) => process.exit(code ?? 0));
