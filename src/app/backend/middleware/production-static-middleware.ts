import express from 'express';

import { logger as appLogger } from '../logger';

export function registerProductionStaticMiddleware(app: express.Express) {
  if (process.env['VITE']) {
    return;
  }

  const serverLog = appLogger.createLogger('server', 0);
  const frontendFiles = process.cwd() + '/dist/client';

  serverLog.info('Servidor Express rodando em modo produção');
  app.use((req, res, next) => {
    serverLog.info(`Servindo arquivos estáticos de: ${frontendFiles}`);
    return express.static(frontendFiles)(req, res, (err) => {
      if (err) {
        serverLog.error('Error serving static files', err);
        return res.status(500).send('Error serving static files');
      }
      next();
    });
  });
}
