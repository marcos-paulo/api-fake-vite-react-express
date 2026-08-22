#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getConfig } from '../../shared/config';
import { ProcessSupervisor, spawnManagedProcess, waitForPort } from '../process-supervisor';
import { getShell, isShellId, listShellIds, type ShellDefinition, shells } from '../shells-registry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseShellArg(): ShellDefinition {
  const flag = process.argv.find((arg) => arg.startsWith('--shell='));
  const requested = flag?.split('=')[1] ?? process.env.API_FAKE_SHELL ?? 'puppeteer';

  if (!isShellId(requested)) {
    console.error(`Shell desconhecido: "${requested}". Shells válidos: ${listShellIds().join(', ')}`);
    process.exit(1);
  }

  const shell = getShell(requested);

  if (!shell.prodReady) {
    const readyIds = listShellIds().filter((id) => shells[id].prodReady);
    console.error(
      `O shell "${shell.id}" ainda não tem um caminho de produção suportado.\n` +
        `Shells prontos pra produção: ${readyIds.join(', ')}.`,
    );
    process.exit(1);
  }

  return shell;
}

const shell = parseShellArg();

// Resolve a raiz do pacote em dois cenarios:
// 1) build local (saida em dist/bin)
// 2) pacote instalado em node_modules (entrada em bin)
function resolvePackageRoot() {
  const candidates = [path.resolve(__dirname, '..'), path.resolve(__dirname, '..', '..')];

  return (
    candidates.find((candidate) => fs.existsSync(path.join(candidate, 'dist', 'server', 'server.js'))) ??
    candidates[0]
  );
}

const pkgRoot = resolvePackageRoot();
const workDir = process.cwd();

// Mantem o mesmo diretorio de trabalho para leitura de api-fake.config.json,
// igual ao fluxo usado pelo server.ts.
process.env.API_FAKE_WORKDIR = process.env.API_FAKE_WORKDIR ?? workDir;

const serverEntry = path.join(pkgRoot, 'dist', 'server', 'server.js');
const uiEntry = shell.prodUiEntry ? path.join(pkgRoot, 'dist', shell.prodUiEntry) : null;
const clientEntry = path.join(pkgRoot, 'dist', 'client', 'index.html');

function assertBuildArtifacts() {
  const required = [
    serverEntry,
    ...(uiEntry ? [uiEntry] : []),
    ...(shell.needsWebFrontend ? [clientEntry] : []),
  ];
  const missingFiles = required.filter((filePath) => !fs.existsSync(filePath));

  if (missingFiles.length > 0) {
    console.error(
      'Arquivos de produção não encontrados. Gere o pacote de release antes de executar.',
    );
    missingFiles.forEach((filePath) => console.error(` - ${filePath}`));
    process.exit(1);
  }
}

const config = getConfig();
const env = { ...process.env, NODE_ENV: 'production' };

const supervisor = new ProcessSupervisor();
supervisor.registerSignalHandlers();

async function start() {
  // Falha cedo se os artefatos de release nao foram gerados.
  assertBuildArtifacts();

  console.log(`📦 Iniciando api-fake em modo produção com ${shell.label}...`);

  // A TUI ocupa o terminal com renderização em tela cheia (raw mode do Ink) —
  // logs do backend escritos ali por cima corrompem a tela. Os demais shells
  // não usam o terminal pra UI, então o backend herda o stdio normalmente.
  const backendLogPath = shell.ttyExclusive
    ? path.join(process.env.API_FAKE_WORKDIR ?? workDir, 'api-fake-tui-backend.log')
    : undefined;

  if (backendLogPath) {
    console.log(`📄 Logs do backend redirecionados para: ${backendLogPath}`);
  }

  const serverProcess = spawnManagedProcess({
    command: process.execPath,
    args: [serverEntry],
    cwd: pkgRoot,
    env,
    logFilePath: backendLogPath,
  });
  supervisor.track(serverProcess);

  // Espera o servidor HTTP subir antes de abrir a UI, evitando corrida na
  // inicialização.
  await waitForPort(config.API_PORT);

  if (uiEntry) {
    const uiProcess = spawnManagedProcess({ command: process.execPath, args: [uiEntry], cwd: pkgRoot, env });
    supervisor.track(uiProcess);
  } else {
    console.log(`✔ Servidor pronto em http://localhost:${config.API_PORT} — abra no navegador.`);
  }
}

start().catch((error) => {
  console.error('Erro ao iniciar api-fake em modo produção.', error);
  supervisor.shutdown(1);
});
