#!/usr/bin/env node
// Ponto único de entrada pra rodar qualquer shell em desenvolvimento:
//
//   npm run dev -- browser|puppeteer|electron|tui
//
// Substitui os antigos bin/api-fake-*.mjs da raiz do repo (um arquivo quase
// idêntico por shell) e scripts/dev-tui.mjs (spawn manual só pra TUI, por causa
// do TTY — ver comentário abaixo). Confirmado que ninguém depende deles como
// comando global via `npm link`; por isso deixaram de existir como "bin" do
// package.json.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getConfig } from '../../shared/config';
import { ProcessSupervisor, spawnManagedProcess, waitForPort } from '../process-supervisor';
import { getShell, isShellId, listShellIds } from '../shells-registry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/boot/bin -> raiz do repo
const repoRoot = path.resolve(__dirname, '..', '..', '..');

const requested = process.argv[2];

if (!requested || !isShellId(requested)) {
  console.error(`Uso: npm run dev -- <shell>\nShells disponíveis: ${listShellIds().join(', ')}`);
  process.exit(1);
}

const shell = getShell(requested);

const supervisor = new ProcessSupervisor();
supervisor.registerSignalHandlers();

async function start() {
  if (shell.ttyExclusive) {
    // A TUI (Ink) precisa herdar o TTY real do terminal para o modo raw do
    // teclado funcionar. O `concurrently` usado pelos outros shells de dev
    // multiplexa stdio entre processos e quebra isso ("Raw mode is not
    // supported"). Por isso aqui o backend roda em background com logs
    // redirecionados pra arquivo, e só a TUI fica dona do terminal.
    const backendLogPath = path.join(repoRoot, 'api-fake-tui-backend.dev.log');
    console.log(`🚀 Iniciando backend em background para a TUI — logs em: ${backendLogPath}`);

    const backend = spawnManagedProcess({
      command: 'npm',
      args: ['run', 'server:dev:watch'],
      cwd: repoRoot,
      shell: true,
      logFilePath: backendLogPath,
    });
    supervisor.track(backend, {
      onUnexpectedExit: (code) => {
        console.error(`Backend encerrou inesperadamente (code ${code}). Veja ${backendLogPath}`);
      },
    });

    await waitForPort(getConfig().API_PORT);

    const tui = spawnManagedProcess({ command: 'npm', args: ['run', 'tui:dev'], cwd: repoRoot, shell: true });
    supervisor.track(tui);
    return;
  }

  if (!shell.devScript) {
    console.error(`Shell "${shell.id}" não tem script de dev configurado.`);
    process.exit(1);
  }

  console.log(`🚀 Iniciando api-fake no ${shell.label}...`);
  const dev = spawnManagedProcess({ command: 'npm', args: ['run', shell.devScript], cwd: repoRoot, shell: true });
  supervisor.track(dev);
}

start().catch((error) => {
  console.error(`Erro ao iniciar api-fake no ${shell.label}.`, error);
  supervisor.shutdown(1);
});
