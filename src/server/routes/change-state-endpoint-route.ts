import type { Express } from 'express';

import { type Endpoint } from '../../types/endpoints.types';
import { endpointsServer } from '../dynamic-endpoints';
import { logger as appLogger } from '../logger';

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

export function registerChangeStateEndpointRoute(app: Express) {
  app.post<Endpoint[], string>('/api/changeStateEndpoint', (req, res, next) => {
    const log = startRouteLog('POST /api/changeStateEndpoint');
    log.info('REQUEST: /api/changeStateEndpoint');
    try {
      const endpoint = req.body;
      endpointsServer.toggleEndpoints(endpoint);
      res.status(200).send('');
    } catch (error) {
      next({ error, status: 400 });
    } finally {
      log.endSection();
    }
  });
}
