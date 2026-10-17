import { spawn } from 'node:child_process';

import type { Express } from 'express';

import { resolveEndpointFilePath } from '../../../shared/resolve-endpoint-file-path';
import { requestLogger } from '../logging/logger-requests';

type OpenEndpointFileRequest = {
  fileName?: string;
};

const EDITOR_COMMAND = 'code';

const startRouteLog = (route: string) => requestLogger.startSection(`HTTP ${route}`);

// `spawn` reporta falha (ex.: comando fora do PATH) de forma assíncrona, pelo evento `error` —
// sem um listener, o Node derruba o processo. Resolve só depois de saber se o editor subiu.
function launchEditor(absolutePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const editorProcess = spawn(EDITOR_COMMAND, ['-g', absolutePath], {
      detached: true,
      stdio: 'ignore',
    });
    editorProcess.once('error', reject);
    editorProcess.once('spawn', () => {
      editorProcess.unref();
      resolve();
    });
  });
}

export function registerOpenEndpointFileRoute(app: Express) {
  app.post('/api/open-endpoint-file', async (req, res) => {
    const log = startRouteLog('POST /api/open-endpoint-file');
    try {
      const { fileName } = (req.body ?? {}) as OpenEndpointFileRequest;

      if (!fileName || typeof fileName !== 'string') {
        log.warn('Requisição recusada (400): fileName ausente ou inválido');
        return res.status(400).json({ error: 'fileName é obrigatório' });
      }

      if (!/\.(ts|js)$/i.test(fileName)) {
        log.warn(`Requisição recusada (400): extensão não permitida em "${fileName}"`);
        return res.status(400).json({ error: 'Apenas arquivos .ts e .js são permitidos' });
      }

      const resolved = resolveEndpointFilePath(fileName);

      if (!resolved.ok) {
        if (resolved.reason === 'invalid-path') {
          log.warn(`Requisição recusada (400): "${fileName}" aponta para fora de endpoints/`);
          return res.status(400).json({ error: 'Caminho de arquivo inválido' });
        }
        log.warn(`Requisição recusada (404): arquivo não encontrado "${fileName}"`);
        return res.status(404).json({ error: `Arquivo não encontrado: ${fileName}` });
      }

      log.step(`Abrindo no editor: ${EDITOR_COMMAND} -g ${resolved.absolutePath}`);

      try {
        await launchEditor(resolved.absolutePath);
      } catch (error) {
        log.error(`Falha ao iniciar o comando "${EDITOR_COMMAND}" (500)`, error);
        return res
          .status(500)
          .json({ error: `Não foi possível iniciar o comando "${EDITOR_COMMAND}"` });
      }

      log.info(`REQUEST: /api/open-endpoint-file -> ${resolved.absolutePath}`);
      return res.status(200).json({ ok: true });
    } catch (error) {
      log.error('Erro inesperado ao abrir arquivo de endpoint (500)', error);
      return res.status(500).json({ error: 'Erro interno ao abrir o arquivo' });
    } finally {
      log.endSection();
    }
  });
}
