#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import waitOn from 'wait-on';
import { getConfig } from '../server/server-load-config';

// Resolve a raiz do pacote em dois cenarios:
// 1) build local (saida em dist/bin)
// 2) pacote instalado em node_modules (entrada em bin)
function resolvePackageRoot() {
  const candidates = [path.resolve(__dirname, '..'), path.resolve(__dirname, '..', '..')];

  return (
    candidates.find((candidate) => {
      const distServer = path.join(candidate, 'dist', 'server', 'server.cjs');
      const distPuppeteer = path.join(candidate, 'dist', 'puppeteer', 'main.js');
      return fs.existsSync(distServer) && fs.existsSync(distPuppeteer);
    }) ?? candidates[0]
  );
}

const pkgRoot = resolvePackageRoot();
const workDir = process.cwd();

// Mantem o mesmo diretorio de trabalho para leitura de api-fake.config.json,
// igual ao fluxo usado pelo server.ts.
process.env.API_FAKE_WORKDIR = process.env.API_FAKE_WORKDIR ?? workDir;

const serverEntry = path.join(pkgRoot, 'dist', 'server', 'server.cjs');
const puppeteerEntry = path.join(pkgRoot, 'dist', 'puppeteer', 'main.js');

function assertBuildArtifacts() {
  const missingFiles = [serverEntry, puppeteerEntry].filter((filePath) => !fs.existsSync(filePath));

  if (missingFiles.length > 0) {
    console.error(
      'Arquivos de produção não encontrados. Gere o pacote de release antes de executar.',
    );
    missingFiles.forEach((filePath) => console.error(` - ${filePath}`));
    process.exit(1);
  }
}

const config = getConfig();
const serverPort = config.API_PORT;
// Garante que os filhos (server + puppeteer) herdem o mesmo contexto de execucao.
const env = { ...process.env, NODE_ENV: 'production', API_FAKE_WORKDIR: workDir };

let serverProcess: ChildProcess | null = null;
let puppeteerProcess: ChildProcess | null = null;
let shuttingDown = false;

function stopChild(child: ChildProcess | null, signal: NodeJS.Signals = 'SIGTERM') {
  if (child && !child.killed) {
    child.kill(signal);
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopChild(puppeteerProcess);
  stopChild(serverProcess);
  process.exit(exitCode);
}

async function start() {
  // Falha cedo se os artefatos de release nao foram gerados.
  assertBuildArtifacts();

  console.log('📦 Iniciando api-fake em modo produção com Puppeteer...');

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: pkgRoot,
    stdio: 'inherit',
    env,
  });

  serverProcess.on('exit', (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 0);
    }
  });

  // Espera o servidor HTTP subir antes de abrir a janela do Puppeteer,
  // evitando corrida na inicializacao.
  await waitOn({
    resources: [`tcp:127.0.0.1:${serverPort}`],
    timeout: 30000,
  });

  puppeteerProcess = spawn(process.execPath, [puppeteerEntry], {
    cwd: pkgRoot,
    stdio: 'inherit',
    env,
  });

  puppeteerProcess.on('exit', (code) => {
    shutdown(code ?? 0);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start().catch((error) => {
  console.error('Erro ao iniciar api-fake em modo produção.', error);
  shutdown(1);
});
