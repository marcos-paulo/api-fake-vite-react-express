import fs from 'node:fs';
import path from 'node:path';

import { ensureLogsDir } from '../../shared/logs-dir';
import { Logger, type LogWriter } from './logger';

const logFilePath = path.join(
  ensureLogsDir(),
  process.env.NODE_ENV === 'production' ? 'requests.log' : 'requests.dev.log',
);

// eslint-disable-next-line no-control-regex -- precisa casar o byte de escape ANSI pra tirar cor das linhas gravadas no arquivo
const ANSI_CODES = /\x1b\[[0-9;]*m/g;

function formatCause(cause: unknown): string {
  if (cause instanceof Error) return cause.stack ?? cause.message;
  if (typeof cause === 'string') return cause;
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

const fileWriter: LogWriter = (_level, message, cause) => {
  const timestamp = new Date().toISOString();
  const plainMessage = message.replace(ANSI_CODES, '');
  const causeText = cause !== undefined ? ` ${formatCause(cause)}` : '';
  fs.appendFileSync(logFilePath, `[${timestamp}] ${plainMessage}${causeText}\n`);
};

// Logger dedicado a tudo que acontece durante o ciclo de uma requisição HTTP —
// rotas (routes/*.ts), dynamic-endpoints-middleware.ts e
// global-error-handler.ts importam este módulo (em vez de ../logger) pra que
// as seções "HTTP <rota>" caiam sempre em logs/requests(.dev).log, isoladas
// dos logs de inicialização/seções internas do servidor em
// logs/backend(.dev).log — mesmo quando a TUI é o shell ativo e redireciona o
// stdout inteiro do backend pra arquivo (ver process-supervisor.ts).
export const requestLogger = new Logger(fileWriter);

export const requestsLogFilePath = logFilePath;
