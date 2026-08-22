#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import waitOn from 'wait-on';

// A TUI (Ink) precisa herdar o TTY real do terminal para o modo raw do
// teclado funcionar. O `concurrently` usado pelos outros shells de dev
// (dev:with:puppeteer, dev:with:electron) multiplexa stdio entre processos e
// quebra isso ("Raw mode is not supported"). Por isso aqui o backend roda em
// background com logs redirecionados pra arquivo, e só a TUI fica com o
// terminal.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const backendLogPath = path.join(rootDir, 'api-fake-tui-backend.dev.log');
const backendLogStream = fs.createWriteStream(backendLogPath, { flags: 'a' });

console.log(`🚀 Iniciando backend em background para a TUI — logs em: ${backendLogPath}`);

const backend = spawn('npm', ['run', 'server:dev:watch'], {
  cwd: rootDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
  shell: true,
});
backend.stdout.pipe(backendLogStream);
backend.stderr.pipe(backendLogStream);

let shuttingDown = false;
let tui = null;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (tui && !tui.killed) tui.kill('SIGTERM');
  if (!backend.killed) backend.kill('SIGTERM');
  process.exit(code);
}

backend.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`Backend encerrou inesperadamente (code ${code}). Veja ${backendLogPath}`);
    shutdown(code ?? 1);
  }
});

try {
  await waitOn({ resources: ['tcp:127.0.0.1:3342'], timeout: 30000 });
} catch (error) {
  console.error('Backend não subiu a tempo.', error);
  shutdown(1);
}

tui = spawn('npm', ['run', 'tui:dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

tui.on('exit', (code) => shutdown(code ?? 0));

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
