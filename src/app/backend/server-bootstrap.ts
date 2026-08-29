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

  // Handlers async sem try/catch (ex.: rotas que fazem await sem tratar erro)
  // caem aqui em vez de virar um 500 rastreável pelo global-error-handler — sem
  // isso, o erro só aparecia como warning genérico do Node, fora de qualquer log.
  process.on('unhandledRejection', (reason) => {
    serverLog.error('Unhandled Rejection detectada', reason);
  });
};

export function startServerBootstrap(app: Express, port: number) {
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
