import path from 'node:path';

import { ensureLogsDir } from '../../../shared/logs-dir';
import { createFileWriter } from './file-log-writer';
import { Logger } from './logger';

const logFilePath = path.join(
  ensureLogsDir(),
  process.env.NODE_ENV === 'production' ? 'requests.log' : 'requests.dev.log',
);

// Logger dedicado a tudo que acontece durante o ciclo de uma requisição HTTP —
// rotas (routes/*.ts), dynamic-endpoints-middleware.ts e
// global-error-handler.ts importam este módulo (em vez de logger-app.ts) pra
// que as seções "HTTP <rota>" caiam sempre em logs/requests(.dev).log,
// isoladas dos logs de inicialização/seções internas do servidor em
// logs/backend(.dev).log. Diferente do logger do app, este não escreve no
// console em nenhum shell — o volume de log por requisição só cabe no
// arquivo.
export const requestLogger = new Logger([createFileWriter(logFilePath)]);

export const requestsLogFilePath = logFilePath;
