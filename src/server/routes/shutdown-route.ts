import type { Express } from 'express';

import { logger as appLogger } from '../logger';

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

export function registerShutdownRoute(app: Express) {
  app.post('/api/shutdown', (_req, res) => {
    const log = startRouteLog('POST /api/shutdown');
    log.info('REQUEST: /api/shutdown');
    res.status(200).send('');
    log.endSection();
    process.exit(0);
  });
}
