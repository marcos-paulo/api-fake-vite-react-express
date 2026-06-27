#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const pkgRoot = path.resolve(__dirname, '..');
const workDir = process.cwd();
const electronMain = path.join(pkgRoot, 'dist', 'electron', 'main.js');

const isFirstRun = !fs.existsSync(electronMain);

if (isFirstRun) {
  console.log('🔨 Primeira execução: compilando Electron...');
  execSync('npm run electron:compile', { cwd: pkgRoot, stdio: 'inherit' });
}

console.log('🚀 Iniciando api-fake com Electron...');
const child = spawn('npm', ['run', 'dev:with:electron'], {
  cwd: pkgRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, API_FAKE_WORKDIR: workDir },
});

child.on('exit', (code) => process.exit(code ?? 0));
