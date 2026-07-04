import fs from 'fs';
import path from 'path';
import puppeteer, { Browser } from 'puppeteer';
import { fileURLToPath } from 'url';
import { getConfig } from '../server/server-load-config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';
const clientPort = getConfig().APP_PORT;
const productionPort = getConfig().API_PORT;

let browser: Browser | null = null;

async function openWindow() {
  const targetUrl = isDev ? `http://localhost:${clientPort}` : `http://localhost:${productionPort}`;

  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [`--app=${targetUrl}`, '--start-maximized'],
  });

  if (isDev) {
    console.log('🚀  Carregando aplicação em modo desenvolvimento...');
    console.log(`🔌  Porta do cliente: ${clientPort}`);
    console.log(`🪟   Modo app: ${targetUrl}`);
  } else {
    console.log('📦  Carregando aplicação em modo produção...');
    console.log(`🔌  Porta do servidor: ${productionPort}`);
    console.log(`🪟   Modo app: ${targetUrl}`);
  }

  browser.on('disconnected', () => {
    process.exit(0);
  });
}

async function shutdown() {
  if (browser) {
    await browser.close();
    browser = null;
  }
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

void openWindow();
