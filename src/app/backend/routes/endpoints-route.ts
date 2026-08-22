import type { Express } from 'express';

import { endpointsServer } from '../dynamic-endpoints';
import { logger as appLogger } from '../logger';

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

export function registerEndpointsRoute(app: Express) {
  app.get('/api/endpoints', async (_req, res) => {
    const log = startRouteLog('GET /api/endpoints');
    try {
      log.info('REQUEST: /api/endpoints');
      const endpoints = await endpointsServer.getEndpoints();
      res.json(endpoints);
    } finally {
      log.endSection();
    }
  });
}
