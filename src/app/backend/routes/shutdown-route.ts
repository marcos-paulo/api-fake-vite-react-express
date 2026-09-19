import type { Express } from 'express';

import { requestLogger } from '../request-file-logger';

const startRouteLog = (route: string) => requestLogger.startSection(`HTTP ${route}`);

export function registerShutdownRoute(app: Express) {
  app.post('/api/shutdown', (_req, res) => {
    const log = startRouteLog('POST /api/shutdown');
    log.info('REQUEST: /api/shutdown');
    res.status(200).send('');
    log.endSection();
    process.exit(0);
  });
}
