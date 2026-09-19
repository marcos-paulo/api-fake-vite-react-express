import path from 'node:path';

import { ensureLogsDir } from '../../../shared/logs-dir';
import { createFileWriter } from './file-log-writer';
import { Logger, type LogWriter } from './logger';

const backendLogFilePath = path.join(
  ensureLogsDir(),
  process.env.NODE_ENV === 'production' ? 'backend.log' : 'backend.dev.log',
);
const backendFileWriter = createFileWriter(backendLogFilePath);

const consoleWriter: LogWriter = (level, message, cause) => {
  console[level](message, ...(cause !== undefined ? [cause] : []));
};

// A TUI (Ink) toma conta do terminal inteiro (alt screen + raw mode) — se o
// logger do app escrevesse no console enquanto ela roda, corromperia a tela.
// Por isso, quando o shell ativo é a TUI, o log do app vai só pro arquivo;
// nos demais shells (browser, puppeteer, electron — processos "externos" que
// não disputam o terminal com o backend), vai pros dois: arquivo e console.
// `API_FAKE_SHELL` é setado pelos scripts de boot (api-fake-dev.ts /
// api-fake-prod.ts) ao subir o processo do backend.
const isTuiShell = process.env.API_FAKE_SHELL === 'tui';
const appLogWriters: LogWriter[] = isTuiShell
  ? [backendFileWriter]
  : [backendFileWriter, consoleWriter];

// Logger de inicialização/seções internas do servidor (dynamic-endpoints.ts,
// server-bootstrap.ts, production-static-middleware.ts) — grava em
// .logs/api-fake/backend(.dev).log.
export const appLogger = new Logger(appLogWriters);

export { backendLogFilePath };
