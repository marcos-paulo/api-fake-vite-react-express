import { spawn } from 'node:child_process';

import type { Express } from 'express';

import { resolveEndpointFilePath } from '../../../shared/resolve-endpoint-file-path';
import { requestLogger } from '../logging/logger-requests';

type OpenEndpointFileRequest = {
  fileName?: string;
};

const startRouteLog = (route: string) => requestLogger.startSection(`HTTP ${route}`);

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

      const resolved = resolveEndpointFilePath(fileName);

      if (!resolved.ok) {
        if (resolved.reason === 'invalid-path') {
          return res.status(400).json({ error: 'Caminho de arquivo inválido' });
        }
        return res.status(404).json({ error: `Arquivo não encontrado: ${fileName}` });
      }

      const codeProcess = spawn('code', ['-g', resolved.absolutePath], {
        detached: true,
        stdio: 'ignore',
      });
      codeProcess.unref();

      log.info(`REQUEST: /api/open-endpoint-file -> ${resolved.absolutePath}`);
      return res.status(200).json({ ok: true });
    } finally {
      log.endSection();
    }
  });
}
