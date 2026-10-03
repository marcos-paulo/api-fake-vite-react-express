import type { Express } from 'express';

import { toHttpError } from '../agent-control';
import { endpointsServer } from '../dynamic-endpoints';
import { requestLogger } from '../logging/logger-requests';

const startRouteLog = (route: string) => requestLogger.startSection(`HTTP ${route}`);

/**
 * Canal do agente de IA (usado pelo CLI `api-fake-agent`). Aplica o modelo de aprovação:
 * o agente só alterna entre handlers `approved` de endpoints já ligados. Ligar/desligar
 * endpoint, aprovar e revogar ficam nas rotas do painel (que recusam o header de agente).
 */
export function registerAgentRoutes(app: Express) {
  app.get('/api/agent/endpoints', async (_req, res, next) => {
    const log = startRouteLog('GET /api/agent/endpoints');
    try {
      res.json(await endpointsServer.listForAgent());
    } catch (error) {
      next(toHttpError(error));
    } finally {
      log.endSection();
    }
  });

  app.post('/api/agent/set-handler', async (req, res, next) => {
    const log = startRouteLog('POST /api/agent/set-handler');
    try {
      const { endpoint, handler } = (req.body ?? {}) as { endpoint?: string; handler?: string };

      if (!endpoint || !handler) {
        return next(toHttpError(new Error('endpoint e handler são obrigatórios')));
      }

      await endpointsServer.agentSetHandler(endpoint, handler);
      res.status(200).json({ ok: true, endpoint, handler });
    } catch (error) {
      next(toHttpError(error));
    } finally {
      log.endSection();
    }
  });
}
