import type { Express } from 'express';

import { endpointsServer } from '../dynamic-endpoints';
import { logger as appLogger } from '../logger';

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

type ChangeActiveHandlerRequest = {
  fileName?: string;
  handlerKey?: string;
};

export function registerChangeActiveHandlerRoute(app: Express) {
  app.post('/api/changeActiveHandler', (req, res, next) => {
    const log = startRouteLog('POST /api/changeActiveHandler');
    log.info('REQUEST: /api/changeActiveHandler');
    try {
      const { fileName, handlerKey } = req.body as ChangeActiveHandlerRequest;

      if (!fileName || !handlerKey) {
        return next({ error: new Error('fileName e handlerKey são obrigatórios'), status: 400 });
      }

      endpointsServer.changeActiveHandler(fileName, handlerKey);
      res.status(200).send('');
    } catch (error) {
      next({ error, status: 400 });
    } finally {
      log.endSection();
    }
  });
}
