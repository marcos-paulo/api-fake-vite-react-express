import crypto from 'crypto';
import type { Express } from 'express';

import { getPanelTokenFilePath, readOrCreatePanelToken } from '../../../shared/panel-token';
import { appLogger } from '../logging/logger-app';
import { PANEL_MUTATING_PATHS } from '../panel-routes';

export const PANEL_TOKEN_HEADER = 'x-api-fake-token';

function isSameToken(received: string | undefined, expected: string): boolean {
  if (!received) return false;

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

/**
 * Exige o token do painel nas ações de humano. O CLI do agente nunca recebe nem lê esse token:
 * com ele, trocar para um handler bloqueado ou aprovar o próprio código deixa de ser um simples
 * `curl`. Leituras (GET) seguem abertas — sem o token elas não dão poder nenhum.
 */
export function registerRequirePanelTokenMiddleware(app: Express) {
  const log = appLogger.createLogger('panel-token', 0);
  const expectedToken = readOrCreatePanelToken();
  const tokenFile = getPanelTokenFilePath();

  log.info(`Ações do painel exigem o token guardado em: ${tokenFile}`);

  app.use(PANEL_MUTATING_PATHS, (req, res, next) => {
    if (isSameToken(req.header(PANEL_TOKEN_HEADER), expectedToken)) {
      next();
      return;
    }

    log.warn(`Token do painel ausente ou inválido: ${req.method} ${req.originalUrl}`);
    res.status(401).json({
      error: `Token do painel ausente ou inválido. Ele fica em ${tokenFile}`,
      code: 'panel_token_required',
      tokenFile,
    });
  });
}
