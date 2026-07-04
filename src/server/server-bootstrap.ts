import type { Express } from 'express';

import { endpointsServer, startServerEndpointsManager } from './dynamic-endpoints';
import { logger as appLogger } from './logger';
import { notifySseClients } from './routes/events-route';

const serverLog = appLogger.createLogger('server', 0);

const startEndpointsBackgroundManager = () => {
  startServerEndpointsManager();
  endpointsServer.onReload(notifySseClients);
};

export function startServerBootstrap(app: Express, port: string) {
  serverLog.info('Iniciando servidor Express...');
  app.listen(port, (error) => {
    if (error) {
      serverLog.error('Error to start server express', error);
      throw error;
    }

    serverLog.success(`Server is running at http://localhost:${port}`);
    startEndpointsBackgroundManager();
  });
}
