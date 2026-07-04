import type { Express, Request, Response } from 'express';

import { endpointsServer } from '../dynamic-endpoints';
import { logger as appLogger } from '../logger';

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

export function registerDynamicEndpointsMiddleware(app: Express) {
  app.use((req: Request, res: Response, next) => {
    const log = startRouteLog(`${req.method} ${req.path}`);
    try {
      const enabledEndpoint = endpointsServer.enabledEndpointModules.find(
        (endpointModule) => endpointModule.localhostEndpoint === req.path,
      );

      if (enabledEndpoint) {
        log.success(
          `REQUEST API FAKE: ${req.method} ${req.path} -> Endpoint encontrado: ${enabledEndpoint.localhostEndpoint}`,
        );
        return enabledEndpoint.handler(req, res);
      }

      if (req.path.startsWith('/api/')) {
        log.warn(`Endpoint não encontrado: ${req.path}`);
        log.warn('Endpoints habilitados:');
        endpointsServer.enabledEndpointModules.forEach((endpointModule) => {
          log.info(` - ${endpointModule.localhostEndpoint}`);
        });

        return res.status(404).send('');
      }

      next();
    } finally {
      log.endSection();
    }
  });
}
