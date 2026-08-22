#!/usr/bin/env node

import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import waitOn from 'wait-on';

import { getConfig } from '../server/server-load-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve a raiz do pacote em dois cenarios:
// 1) build local (saida em dist/bin)
// 2) pacote instalado em node_modules (entrada em bin)
// Camada extra e opcional, paralela ao shell padrão (Puppeteer) — não vira o
// comportamento principal. Ativada só com --tui / API_FAKE_UI=tui.
const useTui = process.argv.includes('--tui') || process.env.API_FAKE_UI === 'tui';

function resolvePackageRoot() {
  const candidates = [path.resolve(__dirname, '..'), path.resolve(__dirname, '..', '..')];
  const uiDistDir = useTui ? 'tui' : 'puppeteer';

  return (
    candidates.find((candidate) => {
      const distServer = path.join(candidate, 'dist', 'server', 'server.js');
      const distUi = path.join(candidate, 'dist', uiDistDir, 'main.js');
      return fs.existsSync(distServer) && fs.existsSync(distUi);
    }) ?? candidates[0]
  );
}

const pkgRoot = resolvePackageRoot();
const workDir = process.cwd();

// Mantem o mesmo diretorio de trabalho para leitura de api-fake.config.json,
// igual ao fluxo usado pelo server.ts.
process.env.API_FAKE_WORKDIR = process.env.API_FAKE_WORKDIR ?? workDir;

const serverEntry = path.join(pkgRoot, 'dist', 'server', 'server.js');
const uiEntry = path.join(pkgRoot, 'dist', useTui ? 'tui' : 'puppeteer', 'main.js');

function assertBuildArtifacts() {
  const missingFiles = [serverEntry, uiEntry].filter((filePath) => !fs.existsSync(filePath));

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
// Garante que os filhos (server + UI) herdem o mesmo contexto de execucao.
// process.env.API_FAKE_WORKDIR ja foi resolvido acima (respeita um valor
// externo pre-existente antes de cair para workDir) — nao sobrescrever aqui.
const env = { ...process.env, NODE_ENV: 'production' };

let serverProcess: ChildProcess | null = null;
let uiProcess: ChildProcess | null = null;
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
  stopChild(uiProcess);
  stopChild(serverProcess);
  process.exit(exitCode);
}

async function start() {
  // Falha cedo se os artefatos de release nao foram gerados.
  assertBuildArtifacts();

  console.log(`📦 Iniciando api-fake em modo produção com ${useTui ? 'TUI' : 'Puppeteer'}...`);

  // A TUI ocupa o terminal com renderização em tela cheia (raw mode do Ink) —
  // logs do backend escritos ali por cima corrompem a tela. O Puppeteer nao
  // usa o terminal, entao so redireciona o backend quando useTui.
  if (useTui) {
    const backendLogPath = path.join(process.env.API_FAKE_WORKDIR ?? workDir, 'api-fake-tui-backend.log');
    const backendLogStream = fs.createWriteStream(backendLogPath, { flags: 'a' });
    console.log(`📄 Logs do backend redirecionados para: ${backendLogPath}`);

    serverProcess = spawn(process.execPath, [serverEntry], {
      cwd: pkgRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
    serverProcess.stdout?.pipe(backendLogStream);
    serverProcess.stderr?.pipe(backendLogStream);
  } else {
    serverProcess = spawn(process.execPath, [serverEntry], {
      cwd: pkgRoot,
      stdio: 'inherit',
      env,
    });
  }

  serverProcess.on('exit', (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 0);
    }
  });

  // Espera o servidor HTTP subir antes de abrir a UI (Puppeteer ou TUI),
  // evitando corrida na inicializacao.
  await waitOn({
    resources: [`tcp:127.0.0.1:${serverPort}`],
    timeout: 30000,
  });

  uiProcess = spawn(process.execPath, [uiEntry], {
    cwd: pkgRoot,
    stdio: 'inherit',
    env,
  });

  uiProcess.on('exit', (code) => {
    shutdown(code ?? 0);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start().catch((error) => {
  console.error('Erro ao iniciar api-fake em modo produção.', error);
  shutdown(1);
});
