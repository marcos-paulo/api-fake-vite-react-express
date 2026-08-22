import type { Express } from 'express';

import { logger as appLogger } from '../logger';

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

export function registerSimulateErrorRoute(app: Express) {
  app.get('/api/simulate-error', (_req, _res) => {
    const log = startRouteLog('GET /api/simulate-error');
    try {
      throw new Error('Erro simulado para demonstração');
    } finally {
      log.endSection();
    }
    // next({ error: new Error('Erro simulado para demonstração'), status: 500 });
  });
}
