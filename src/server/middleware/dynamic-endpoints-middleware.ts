import type { Express, Request, Response } from 'express';

import { endpointsServer } from '../dynamic-endpoints';
import { logger as appLogger } from '../logger';

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

export function registerDynamicEndpointsMiddleware(app: Express) {
  app.use((req: Request, res: Response, next) => {
    const log = startRouteLog(`${req.method} ${req.path}`);
    try {
      const enabledEndpoint = endpointsServer.enabledEndpointModules.find(
        (endpointModule) => endpointModule.endpoint.localhostAddress === req.path,
      );

      if (enabledEndpoint) {
        log.success(
          `REQUEST API FAKE: ${req.method} ${req.path} -> Endpoint encontrado: ${enabledEndpoint.endpoint.localhostAddress}`,
        );
        return enabledEndpoint.activeHandler(req, res);
      }

      const knownButDisabled = endpointsServer.loadedModules.some(
        (loadedModule) => loadedModule.endpoint?.localhostAddress === req.path,
      );

      if (knownButDisabled) {
        log.warn(`Endpoint encontrado porém desabilitado: ${req.path}`);
        log.warn('Endpoints habilitados:');
        endpointsServer.enabledEndpointModules.forEach((endpointModule) => {
          log.info(` - ${endpointModule.endpoint.localhostAddress}`);
        });

        return res.status(404).send('');
      }

      next();
    } finally {
      log.endSection();
    }
  });
}
