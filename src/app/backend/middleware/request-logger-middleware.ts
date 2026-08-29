import type { Express, NextFunction, Request, Response } from 'express';

import { logger as appLogger } from '../logger';

// createLogger em vez de startSection/endSection: requests são concorrentes
// (e /api/events fica aberto indefinidamente pro SSE), e o Logger usa uma
// pilha compartilhada pra indentação — abrir/fechar "seção" por request faria
// requests concorrentes baguncarem a indentação umas das outras (ou, no caso
// do SSE, prender o indentador de todo mundo enquanto a conexão fica aberta).
const httpLog = appLogger.createLogger('http', 0);

export function registerRequestLoggerMiddleware(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const summary = `${req.method} ${req.path} -> ${res.statusCode} (${durationMs}ms)`;

      if (res.statusCode >= 500) httpLog.error(summary);
      else if (res.statusCode >= 400) httpLog.warn(summary);
      else httpLog.success(summary);
    });

    res.on('close', () => {
      if (!res.writableEnded) {
        const durationMs = Date.now() - startedAt;
        httpLog.warn(`${req.method} ${req.path} -> conexão encerrada sem resposta (${durationMs}ms)`);
      }
    });

    next();
  });
}
