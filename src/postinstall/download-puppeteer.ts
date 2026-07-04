import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// Base para o require: um caminho absoluto qualquer serve (não precisa existir de
// fato), só é usado para resolver o `require(configPath)` abaixo — evita depender de
// import.meta.url, que não sobrevive à compilação para CJS.
const require = createRequire(path.join(process.cwd(), 'package.json'));

// Nomes de variável aceitos (em versões diferentes do Puppeteer) para apontar o
// download do Chrome para um mirror/host interno em vez do host público padrão.
const HOST_ENV_VARS = ['PUPPETEER_DOWNLOAD_BASE_URL', 'PUPPETEER_DOWNLOAD_HOST'] as const;

function resolveBaseUrl(): string | undefined {
  for (const envVar of HOST_ENV_VARS) {
    const value = process.env[envVar];
    if (value) return value;
  }
  return undefined;
}

function isSkipDownloadEnvSet(): boolean {
  const value = process.env.PUPPETEER_SKIP_DOWNLOAD;
  if (!value) return false;
  return !['0', 'false', 'off'].includes(value.toLowerCase());
}

function isSkipDownloadConfigured(): boolean {
  // process.cwd() durante o postinstall de uma dependência aninhada é a pasta do
  // próprio pacote instalado (ex.: node_modules/iib-comunicacao), não a raiz de quem
  // está de fato rodando `npm install`. INIT_CWD é quem aponta para essa raiz real —
  // é lá que faz sentido procurar um .puppeteerrc.cjs definido por quem consome o pacote.
  const searchRoot = process.env.INIT_CWD || process.cwd();
  const configPath = path.join(searchRoot, '.puppeteerrc.cjs');
  if (!fs.existsSync(configPath)) return false;

  try {
    const config = require(configPath);
    return config?.skipDownload === true;
  } catch {
    return false;
  }
}

function downloadChrome() {
  // O próprio pacote puppeteer já baixa o Chrome sozinho no seu postinstall, a menos
  // que PUPPETEER_SKIP_DOWNLOAD esteja ativo ou um .puppeteerrc.cjs com skipDownload:
  // true tenha sido encontrado. Se nenhum dos dois estiver configurado, é seguro
  // assumir que o download automático do puppeteer já cuidou disso — rodar de novo
  // aqui seria redundante (e poderia bater num host que o padrão já resolveu).
  if (!isSkipDownloadEnvSet() && !isSkipDownloadConfigured()) {
    console.log(
      '[postinstall] Download automático do puppeteer não foi desativado (PUPPETEER_SKIP_DOWNLOAD/.puppeteerrc.cjs); assumindo que o Chrome já foi baixado por ele.',
    );
    return;
  }

  const baseUrl = resolveBaseUrl();

  // Chamado pelo nome (sem path absoluto): o npm já coloca node_modules/.bin no PATH
  // durante scripts de lifecycle, e isso funciona igual em dev, empacotado ou instalado
  // como dependência de outro projeto — sem depender de onde este arquivo está localizado.
  const args = ['browsers', 'install', 'chrome'];

  if (baseUrl) {
    console.log(`[postinstall] Host de download do Puppeteer configurado, baixando via: ${baseUrl}`);
    args.push(`--base-url=${baseUrl}`);
  } else {
    console.log(
      '[postinstall] Nenhuma variável de host encontrada, baixando Chrome do host padrão do Puppeteer.',
    );
  }

  execFileSync('puppeteer', args, { stdio: 'inherit' });
}

downloadChrome();
