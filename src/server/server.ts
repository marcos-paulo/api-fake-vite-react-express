import express from 'express';

import { type Endpoint } from '../types/Endpoints';
import { createServerEndpointsManager, endpointsServer } from './dynamic-endpoints';
import { getEnvironmentVariables } from './server-load-envs';

export const app = express();

const CLIENT_APP_PORT = getEnvironmentVariables().CLIENT_API_PORT ?? 3000;

await createServerEndpointsManager();

app.use(express.json());

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

app.post('/api/shutdown', (_req, res) => {
  console.log('REQUEST: /api/shutdown');
  res.status(200).send('');
  process.exit(0);
});

// SIMULAÇÃO: rota que lança erro intencionalmente para demonstrar o error handler
app.get('/api/simulate-error', (_req, _res, next) => {
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
