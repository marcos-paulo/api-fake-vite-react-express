import type { Express, Response } from 'express';

import { logger as appLogger } from '../logger';

const startRouteLog = (route: string) => appLogger.startSection(`HTTP ${route}`);

const sseClients = new Set<Response>();

export const notifySseClients = () => {
  const log = appLogger.startSection('HTTP SSE notify');
  try {
    log.info(`[SSE] Notificando ${sseClients.size} cliente(s) conectado(s)`);
    for (const client of sseClients) {
      client.write('data: reload\n\n');
    }
  } finally {
    log.endSection();
  }
};

export function registerEventsRoute(app: Express) {
  app.get('/api/events', (req, res) => {
    const log = startRouteLog('GET /api/events');
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // Diz ao cliente para reconectar em 1 segundo se a conexão cair
      res.write('retry: 1000\n\n');

      sseClients.add(res);
      log.info(`[SSE] Cliente conectado — total: ${sseClients.size}`);

      // Envia reload imediato para que o cliente busque dados frescos ao (re)conectar
      res.write('data: reload\n\n');

      // Heartbeat para manter a conexão viva através do proxy
      const heartbeat = setInterval(() => {
        res.write(': keepalive\n\n');
      }, 15000);

      req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
        log.info(`[SSE] Cliente desconectado — total: ${sseClients.size}`);
      });
    } finally {
      log.endSection();
    }
  });
}
