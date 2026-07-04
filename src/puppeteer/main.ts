import fs from 'fs';
import path from 'path';
import puppeteer, { Browser } from 'puppeteer';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workDir = process.env.API_FAKE_WORKDIR ?? process.cwd();
const configFile = path.join(workDir, 'api-fake.config.json');

function readConfig(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  } catch {
    return {};
  }
}

const config = readConfig();
const isDev = process.env.NODE_ENV === 'development';
const clientPort = config['CLIENT_APP_PORT'] ?? '3343';

let browser: Browser | null = null;

async function openWindow() {
  const productionFile = path.join(__dirname, '../client/index.html');
  const targetUrl = isDev ? `http://localhost:${clientPort}` : pathToFileURL(productionFile).href;

  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [`--app=${targetUrl}`, '--start-maximized'],
  });

  if (isDev) {
    console.log('🚀\tCarregando aplicação em modo desenvolvimento...');
    console.log(`🔌\tPorta do cliente: ${clientPort}`);
    console.log(`🪟\tModo app: ${targetUrl}`);
  } else {
    console.log('📦 Carregando aplicação em modo produção...');
    console.log(`🪟 Modo app: ${targetUrl}`);
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
