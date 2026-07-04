import { spawn } from 'node:child_process';

import express from 'express';
import fs from 'fs';
import path from 'path';

import { type Endpoint } from '../types/endpoints.types';
import { createServerEndpointsManager, endpointsServer } from './dynamic-endpoints';
import { getConfig } from './server-load-config';

export const app = express();

const CLIENT_APP_PORT = getConfig().CLIENT_API_PORT ?? 3000;

await createServerEndpointsManager();

app.use(express.json());

// CORS para permitir conexão direta do frontend em dev (SSE sem passar pelo proxy do Vite)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// ─── SSE: notificação de reload ───────────────────────────────────────────────

const sseClients = new Set<express.Response>();

endpointsServer.onReload(() => {
  console.log(`[SSE] Notificando ${sseClients.size} cliente(s) conectado(s)`);
  for (const client of sseClients) {
    client.write('data: reload\n\n');
  }
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Diz ao cliente para reconectar em 1 segundo se a conexão cair
  res.write('retry: 1000\n\n');

  sseClients.add(res);
  console.log(`[SSE] Cliente conectado — total: ${sseClients.size}`);

  // Envia reload imediato para que o cliente busque dados frescos ao (re)conectar
  res.write('data: reload\n\n');

  // Heartbeat para manter a conexão viva através do proxy
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`[SSE] Cliente desconectado — total: ${sseClients.size}`);
  });
});

app.get('/api/endpoints', async (_req, res) => {
  'REQUEST: /api/endpoints';
  const endpoints = await endpointsServer.getEndpoints();
  res.json(endpoints);
});

app.post<Endpoint[], string>('/api/changeStateEndpoint', (req, res, next) => {
  console.log('REQUEST: /api/changeStateEndpoint', req.body);
  try {
    const endpoint = req.body;
    endpointsServer.toggleEndpoints(endpoint);
    res.status(200).send('');
  } catch (error) {
    next({ error, status: 400 });
  }
});

app.post('/api/disable', (_req, res) => {
  console.log('REQUEST: /api/disable');
  endpointsServer.disableAllEndpoints();
  res.status(200).send('');
});

type OpenEndpointFileRequest = {
  fileName?: string;
};

app.post('/api/open-endpoint-file', (req, res) => {
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

  console.log(`REQUEST: /api/open-endpoint-file -> ${endpointFilePath}`);
  return res.status(200).json({ ok: true });
});

app.post('/api/shutdown', (_req, res) => {
  console.log('REQUEST: /api/shutdown');
  res.status(200).send('');
  process.exit(0);
});

// SIMULAÇÃO: rota que lança erro intencionalmente para demonstrar o error handler
app.get('/api/simulate-error', (_req, _res) => {
  throw new Error('Erro simulado para demonstração');
  // next({ error: new Error('Erro simulado para demonstração'), status: 500 });
});

// REDIRECIONA PARA OS ENDPOINTS DINÂMICOS
app.use((req, res, next) => {
  const enabledEndpoint = endpointsServer.enabledEndpointModules.find(
    (endpointModule) => endpointModule.localhostEndpoint === req.path,
  );

  if (enabledEndpoint) {
    const info = `\x1b[32mREQUEST API FAKE: ${req.method} ${req.path} → Endpoint encontrado: ${enabledEndpoint.localhostEndpoint}\x1b[0m`;
    console.info(info);
    return enabledEndpoint.handler(req, res);
  }

  if (req.path.startsWith('/api/')) {
    const warn = `\x1b[33mEndpoint não encontrado: ${req.path}\x1b[0m`;
    console.warn(warn);
    console.warn('Endpoints habilitados:');
    endpointsServer.enabledEndpointModules.forEach((endpointModule) => {
      console.log(` - ${endpointModule.localhostEndpoint}`);
    });

    return res.status(404).send('');
  }

  next();
});

console.log('Iniciando servidor Express...');
if (!process.env['VITE']) {
  console.log('Servidor Express rodando em modo produção');
  const frontendFiles = process.cwd() + '/dist/client';
  // app.use(express.static(frontendFiles));
  app.use((req, res, next) => {
    console.info(`Servindo arquivos estáticos de: ${frontendFiles}`);
    return express.static(frontendFiles)(req, res, (err) => {
      if (err) {
        console.error('Error serving static files:', err);
        return res.status(500).send('Error serving static files');
      }
      next();
    });
  });
}

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

// ERROR HANDLER GLOBAL — deve ser o último middleware registrado
app.use(
  (
    err: ConventionalError | Error | unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (!err) {
      console.error('\x1b[31m[Global Error Handler] No error object provided\x1b[0m');
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (isError(err)) {
      console.error('\x1b[31m[Global Error Handler] Unhandled error object\x1b[0m');
      console.error(err.message);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }

    if (isConventionalError(err)) {
      console.error('\x1b[31m[Global Error Handler]\x1b[0m');
      console.error(err.error);
      return res.status(err.status).json({ error: err.error.message });
    }

    console.error('\x1b[31m[Global Error Handler] Unknown error format\x1b[0m');
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  },
);

app.listen(CLIENT_APP_PORT, (error) => {
  if (error) {
    console.error('Error to start server express', error);
    throw error;
  }
  console.log(`Server is running at http://localhost:${CLIENT_APP_PORT}`);
});
