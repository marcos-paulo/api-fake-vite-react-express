import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getConfig } from '../../../../shared/config';
import { readOrCreatePanelToken } from '../../../../shared/panel-token';

const BINARY_NAME = 'api-fake-tauri';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === 'development';
const targetPort = isDev ? getConfig().APP_PORT : getConfig().API_PORT;
const targetUrl = `http://localhost:${targetPort}`;

// O binário vive em native-bin/ na raiz do pacote. A partir deste arquivo isso fica em lugares
// diferentes: dist/tauri/main.js (pacote instalado ou build local) e
// src/app/frontend/shells/tauri/main.ts (dev, via tsx).
function resolveNativeBinary(): string | null {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'native-bin', BINARY_NAME),
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'native-bin', BINARY_NAME),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function failWithGuidance(reason: string): never {
  console.error(`❌  Shell tauri: ${reason}`);
  console.error(
    '    O shell tauri exige webkit2gtk-4.1 e glibc >= 2.34 (ver native/api-fake-tauri/README.md).\n' +
      '    Alternativas sem essa exigência: --shell=puppeteer ou --shell=browser.',
  );
  process.exit(1);
}

function openWindow() {
  const binaryPath = resolveNativeBinary();

  if (!binaryPath) {
    failWithGuidance(
      `binário "${BINARY_NAME}" não encontrado em native-bin/. Gere com "npm run build:native".`,
    );
  }

  const child = spawn(binaryPath, [], { stdio: ['pipe', 'inherit', 'inherit'] });

  // A entrada vai pelo stdin (não por argumento): o token do painel vai no fragmento da URL
  // — o painel o guarda e limpa da barra — e argumentos aparecem na lista de processos.
  child.stdin.end(
    JSON.stringify({
      url: `${targetUrl}#token=${encodeURIComponent(readOrCreatePanelToken())}`,
      title: 'api-fake',
    }),
  );

  console.log(
    isDev
      ? `🚀  Carregando aplicação em modo desenvolvimento (porta do cliente: ${targetPort})...`
      : `📦  Carregando aplicação em modo produção (porta do servidor: ${targetPort})...`,
  );
  console.log(`🪟   Janela nativa (Tauri): ${targetUrl}`);

  child.on('error', (error) => failWithGuidance(`falha ao iniciar o binário (${error.message}).`));

  child.on('exit', (code, signal) => {
    if (code === 0) process.exit(0);
    failWithGuidance(`o binário terminou com ${signal ?? `código ${code}`}.`);
  });

  const stopChild = () => {
    child.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', stopChild);
  process.on('SIGTERM', stopChild);
}

openWindow();
