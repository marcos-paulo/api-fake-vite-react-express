import type { Express } from 'express';

import { appLogger } from '../logging/logger-app';
import { PANEL_PATHS } from '../panel-routes';

export const AGENT_ACTOR_HEADER = 'x-api-fake-actor';

/**
 * O CLI do agente sempre envia `X-Api-Fake-Actor: agent`. As rotas do painel (ligar endpoint,
 * trocar handler livremente, aprovar, revogar) recusam esse header. É uma barreira cooperativa
 * — quem usa HTTP cru (curl) sem o header a contorna; quem barra de fato as ações é o token
 * do painel (require-panel-token-middleware.ts).
 */
export function registerRejectAgentActorMiddleware(app: Express) {
  app.use(PANEL_PATHS, (req, res, next) => {
    if (req.header(AGENT_ACTOR_HEADER) === 'agent') {
      appLogger
        .createLogger('agent-guard', 0)
        .warn(`Recusado (agente): ${req.method} ${req.originalUrl}`);
      res.status(403).json({
        error: 'Rota do painel: agentes só podem usar /api/agent/*. Peça a um humano.',
      });
      return;
    }

    next();
  });
}
