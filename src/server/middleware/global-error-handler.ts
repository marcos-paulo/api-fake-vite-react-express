import type { Express, NextFunction, Request, Response } from 'express';

import { logger as appLogger } from '../logger';

type ConventionalError = {
  error: Error;
  status: number;
};

const isConventionalError = (obj: unknown): obj is ConventionalError => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    obj['error'] instanceof Error &&
    'status' in obj &&
    typeof obj['status'] === 'number'
  );
};

const isError = (obj: unknown): obj is Error => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    typeof obj['message'] === 'string'
  );
};

export function registerGlobalErrorHandler(app: Express) {
  app.use(
    (
      err: ConventionalError | Error | unknown,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const log = appLogger.startSection('HTTP Global Error Handler');
      try {
        if (!err) {
          log.error('[Global Error Handler] No error object provided');
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (isError(err)) {
          log.error('[Global Error Handler] Unhandled error object', err);
          return res.status(500).json({ error: err.message || 'Internal Server Error' });
        }

        if (isConventionalError(err)) {
          log.error('[Global Error Handler]', err.error);
          return res.status(err.status).json({ error: err.error.message });
        }

        log.error('[Global Error Handler] Unknown error format', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      } finally {
        log.endSection();
      }
    },
  );
}
