import type { Express } from 'express';

import { endpointsServer } from '../dynamic-endpoints';
import { logger as appLogger } from '../logger';

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

type ChangeActiveHandlerEntry = {
  fileName?: string;
  handlerKey?: string;
};

export function registerChangeActiveHandlerRoute(app: Express) {
  app.post('/api/changeActiveHandler', (req, res, next) => {
    const log = startRouteLog('POST /api/changeActiveHandler');
    log.info('REQUEST: /api/changeActiveHandler');
    try {
      const changes = req.body as ChangeActiveHandlerEntry[];

      const isValid = changes.every((change) => change.fileName && change.handlerKey);
      if (!isValid) {
        return next({ error: new Error('fileName e handlerKey são obrigatórios'), status: 400 });
      }

      endpointsServer.changeActiveHandlers(changes as { fileName: string; handlerKey: string }[]);
      res.status(200).send('');
    } catch (error) {
      next({ error, status: 400 });
    } finally {
      log.endSection();
    }
  });
}
