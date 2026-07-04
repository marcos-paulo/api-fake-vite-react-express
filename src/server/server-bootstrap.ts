import type { Express } from 'express';

import { endpointsServer, startServerEndpointsManager } from './dynamic-endpoints';
import { logger as appLogger } from './logger';
import { notifySseClients } from './routes/events-route';

const serverLog = appLogger.createLogger('server', 0);

let isShuttingDown = false;

const startEndpointsBackgroundManager = () => {
  startServerEndpointsManager();
  endpointsServer.onReload(notifySseClients);
};

const cleanupEndpoints = () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  const log = appLogger.startSection('Cleanup: Limpando endpoints');
  try {
    log.info('Removendo endpoints do arquivo de proxy');
    endpointsServer.clearProxyEndpointsOnShutdown();
    log.success('Endpoints removidos com sucesso');
  } catch (error) {
    log.error('Erro ao limpar endpoints', error);
  } finally {
    log.endSection();
  }
};

const registerShutdownHandlers = () => {
  process.on('SIGINT', () => {
    serverLog.info('Recebido SIGINT, encerrando aplicação...');
    cleanupEndpoints();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    serverLog.info('Recebido SIGTERM, encerrando aplicação...');
    cleanupEndpoints();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    serverLog.error('Uncaught Exception detectada, encerrando aplicação...', error);
    cleanupEndpoints();
    process.exit(1);
  });
};

export function startServerBootstrap(app: Express, port: string) {
  serverLog.info('Iniciando servidor Express...');
  app.listen(port, (error) => {
    if (error) {
      serverLog.error('Error to start server express', error);
      throw error;
    }

    serverLog.success(`Server is running at http://localhost:${port}`);
    registerShutdownHandlers();
    startEndpointsBackgroundManager();
  });
}
