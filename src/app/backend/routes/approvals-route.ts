import type { Express } from 'express';

import { toHttpError } from '../agent-control';
import { endpointsServer } from '../dynamic-endpoints';
import { requestLogger } from '../logging/logger-requests';

const startRouteLog = (route: string) => requestLogger.startSection(`HTTP ${route}`);

type ApprovalItem = { fileName?: string; handlerKey?: string; hash?: string };

function isItemList(body: unknown, requireHash: boolean): body is Required<ApprovalItem>[] {
  return (
    Array.isArray(body) &&
    body.every(
      (item: ApprovalItem) =>
        !!item?.fileName && !!item.handlerKey && (!requireHash || !!item.hash),
    )
  );
}

/** Rotas do painel para a aprovação humana de handlers que o agente pode ativar. */
export function registerApprovalsRoutes(app: Express) {
  app.get('/api/approvals/pending', async (_req, res, next) => {
    const log = startRouteLog('GET /api/approvals/pending');
    try {
      await endpointsServer.getEndpoints();
      res.json(endpointsServer.getPendingApprovals());
    } catch (error) {
      next(toHttpError(error));
    } finally {
      log.endSection();
    }
  });

  app.post('/api/approvals/approve', (req, res, next) => {
    const log = startRouteLog('POST /api/approvals/approve');
    try {
      if (!isItemList(req.body, true)) {
        return next(toHttpError(new Error('fileName, handlerKey e hash são obrigatórios')));
      }
      endpointsServer.approveHandlers(req.body);
      res.status(200).send('');
    } catch (error) {
      next(toHttpError(error));
    } finally {
      log.endSection();
    }
  });

  app.post('/api/approvals/revoke', (req, res, next) => {
    const log = startRouteLog('POST /api/approvals/revoke');
    try {
      if (!isItemList(req.body, false)) {
        return next(toHttpError(new Error('fileName e handlerKey são obrigatórios')));
      }
      endpointsServer.revokeHandlers(req.body);
      res.status(200).send('');
    } catch (error) {
      next(toHttpError(error));
    } finally {
      log.endSection();
    }
  });

  app.post('/api/approvals/revert-agent-handler', (req, res, next) => {
    const log = startRouteLog('POST /api/approvals/revert-agent-handler');
    try {
      const { fileName } = (req.body ?? {}) as { fileName?: string };
      if (!fileName) {
        return next(toHttpError(new Error('fileName é obrigatório')));
      }
      endpointsServer.revertAgentHandler(fileName);
      res.status(200).send('');
    } catch (error) {
      next(toHttpError(error));
    } finally {
      log.endSection();
    }
  });
}
