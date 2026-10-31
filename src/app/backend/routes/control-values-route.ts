import type { Express } from 'express';

import { toHttpError } from '../agent-control';
import { endpointsServer } from '../dynamic-endpoints';
import { requestLogger } from '../logging/logger-requests';

const startRouteLog = (route: string) => requestLogger.startSection(`HTTP ${route}`);

type ChangeControlEntry = { fileName?: string; key?: string; value?: unknown };
type ResetControlsBody = { fileName?: string; key?: string };

/** Alteração dos controles pelo painel (humano). O agente usa /api/agent/set-control. */
export function registerControlValuesRoutes(app: Express) {
  app.post('/api/changeControlValue', (req, res, next) => {
    const log = startRouteLog('POST /api/changeControlValue');
    try {
      const changes = req.body as ChangeControlEntry[];

      if (!Array.isArray(changes) || !changes.every((change) => change.fileName && change.key)) {
        return next(toHttpError(new Error('fileName e key são obrigatórios')));
      }

      endpointsServer.changeControlValues(
        changes as { fileName: string; key: string; value: unknown }[],
      );
      res.status(200).send('');
    } catch (error) {
      next(toHttpError(error));
    } finally {
      log.endSection();
    }
  });

  app.post('/api/resetControlValues', (req, res, next) => {
    const log = startRouteLog('POST /api/resetControlValues');
    try {
      const { fileName, key } = (req.body ?? {}) as ResetControlsBody;

      if (!fileName) {
        return next(toHttpError(new Error('fileName é obrigatório')));
      }

      endpointsServer.resetControlValues(fileName, key);
      res.status(200).send('');
    } catch (error) {
      next(toHttpError(error));
    } finally {
      log.endSection();
    }
  });
}
