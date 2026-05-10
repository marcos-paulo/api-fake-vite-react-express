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

// REDIRECIONA PARA OS ENDPOINTS DINÂMICOS
app.use((req, res, next) => {
  console.info(`\x1b[36mFAKE API REQUEST: ${req.path}\x1b[0m`);

  const enabledEndpoint = endpointsServer.enabledEndpointModules.find(
    (endpointModule) => endpointModule.localhostEndpoint === req.path,
  );

  if (enabledEndpoint) {
    console.log(
      `Encaminhando requisição para endpoint dinâmico em: ${enabledEndpoint.localhostEndpoint}`,
    );
    return enabledEndpoint.handler(req, res);
  }

  if (req.path.startsWith('/api/')) {
    console.warn(`\x1b[33mEndpoint não encontrado: ${req.path}\x1b[0m`);
    console.warn('Endpoints habilitados:');
    endpointsServer.enabledEndpointModules.forEach((endpointModule) => {
      console.log(` - ${endpointModule.localhostEndpoint}`);
    });

    return res.status(404).send('');
  }

  next();
});

app.use(
  (
    err: { error: Error; status: number },
    _req: express.Request,
    res: express.Response,
     
    _next: express.NextFunction,
  ) => {
    console.error('teste de erro', err);
    res.status(err.status).send('');
  },
);

if (!process.env['VITE']) {
  const frontendFiles = process.cwd() + '/dist';
  app.use(express.static(frontendFiles));
}

app.listen(CLIENT_APP_PORT, (error) => {
  if (error) {
    console.error('Error to start server express', error);
    throw error;
  }
  console.log(`Server is running at http://localhost:${CLIENT_APP_PORT}`);
});
