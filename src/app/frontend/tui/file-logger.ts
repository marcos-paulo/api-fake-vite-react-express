import fs from 'node:fs';
import path from 'node:path';

import { ensureLogsDir } from '../../../shared/logs-dir';

const logFilePath = path.join(
  ensureLogsDir(),
  process.env.NODE_ENV === 'production' ? 'tui.log' : 'tui.dev.log',
);

function formatArg(arg: unknown): string {
  if (arg instanceof Error) return arg.stack ?? arg.message;
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function appendLine(level: string, args: unknown[]) {
  const timestamp = new Date().toISOString();
  const message = args.map(formatArg).join(' ');
  fs.appendFileSync(logFilePath, `[${timestamp}] [${level}] ${message}\n`);
}

// O Ink assume o terminal inteiro (alt screen + raw mode — ver main.tsx), então
// console.log/warn/error escrevendo direto no stdout/stderr corrompe a tela em
// vez de aparecer de forma legível. Substitui os métodos globais do console (em
// vez de expor um logger próprio) pra que qualquer código que já chama
// console.error/warn — inclusive o hook compartilhado em frontend/core, que
// também roda no shell web — caia no arquivo sem precisar saber que está
// rodando dentro da TUI. Mesmo espírito de como o backend já tem seu stdio
// redirecionado pra arquivo quando a TUI é o shell ativo (ver
// boot/bin/api-fake-{dev,prod}.ts).
export function redirectConsoleToFile() {
  console.log = (...args) => appendLine('log', args);
  console.info = (...args) => appendLine('info', args);
  console.warn = (...args) => appendLine('warn', args);
  console.error = (...args) => appendLine('error', args);
  console.debug = (...args) => appendLine('debug', args);
}

export const tuiLogFilePath = logFilePath;
