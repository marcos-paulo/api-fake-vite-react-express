import fs from 'node:fs';

import type { LogWriter } from './logger';

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

// Writer compartilhado por qualquer Logger que precise gravar direto num
// arquivo (logger.ts e request-file-logger.ts) — timestampa a linha, tira o
// código ANSI de cor (não faz sentido num arquivo texto) e serializa o cause
// (Error vira stack) já que fs.appendFileSync não faz o console.error's util.inspect.
export function createFileWriter(filePath: string): LogWriter {
  return (_level, message, cause) => {
    const timestamp = new Date().toISOString();
    const plainMessage = message.replace(ANSI_CODES, '');
    const causeText = cause !== undefined ? ` ${formatCause(cause)}` : '';
    fs.appendFileSync(filePath, `[${timestamp}] ${plainMessage}${causeText}\n`);
  };
}
