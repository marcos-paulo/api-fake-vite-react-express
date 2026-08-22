#!/usr/bin/env node
// Usado no lugar de `wait-on tcp:<porta literal>` nos scripts do package.json —
// lê a porta de getConfig() em tempo de execução, então continua funcionando se
// o usuário mudar APP_PORT/API_PORT no api-fake.config.json (os literais
// travavam esperando a porta padrão, que nunca subia).
//
// Uso: tsx src/boot/wait-for-port.ts --api | --app

import { getConfig } from '../shared/config';
import { waitForPort } from './process-supervisor';

const target = process.argv[2];

if (target !== '--api' && target !== '--app') {
  console.error('Uso: wait-for-port.ts --api | --app');
  process.exit(1);
}

const config = getConfig();
const port = target === '--app' ? config.APP_PORT : config.API_PORT;

waitForPort(port).catch((error) => {
  console.error(`Porta ${port} (${target}) não respondeu a tempo.`, error);
  process.exit(1);
});
