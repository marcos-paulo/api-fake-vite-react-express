import { spawn } from 'node:child_process';

import type { Express } from 'express';
import fs from 'fs';
import path from 'path';

import { logger as appLogger } from '../logger';
import { getConfig } from '../server-load-config';

type OpenEndpointFileRequest = {
  fileName?: string;
};

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

export function registerOpenEndpointFileRoute(app: Express) {
  app.post('/api/open-endpoint-file', (req, res) => {
    const log = startRouteLog('POST /api/open-endpoint-file');
    try {
      const { fileName } = req.body as OpenEndpointFileRequest;

      if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({ error: 'fileName é obrigatório' });
      }

      if (!/\.(ts|js)$/i.test(fileName)) {
        return res.status(400).json({ error: 'Apenas arquivos .ts e .js são permitidos' });
      }

      const normalizedFileName = path.basename(fileName);
      const workspacePath = path.resolve(
        getConfig().WORKSPACES_ROOT_PATH,
        getConfig().ACTIVE_WORKSPACE,
      );
      const endpointsDir = path.resolve(workspacePath, 'endpoints');
      const endpointFilePath = path.resolve(endpointsDir, normalizedFileName);

      if (!endpointFilePath.startsWith(`${endpointsDir}${path.sep}`)) {
        return res.status(400).json({ error: 'Caminho de arquivo inválido' });
      }

      if (!fs.existsSync(endpointFilePath)) {
        return res.status(404).json({ error: `Arquivo não encontrado: ${normalizedFileName}` });
      }

      const codeProcess = spawn('code', ['-g', endpointFilePath], {
        detached: true,
        stdio: 'ignore',
      });
      codeProcess.unref();

      log.info(`REQUEST: /api/open-endpoint-file -> ${endpointFilePath}`);
      return res.status(200).json({ ok: true });
    } finally {
      log.endSection();
    }
  });
}
