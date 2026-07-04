import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import type { getConfig } from './src/server/server-load-config';

// https://vite.dev/config/
export default defineConfig(async () => {
  // verifica se 'e processo de build ou de desenvolvimento
  const isBuild = process.env['VITE'] === 'true' || process.env['NODE_ENV'] === 'production';

  // Determina como abrir o browser
  let openConfig: boolean | string = false;
  let config: Awaited<ReturnType<typeof getConfig>> | undefined = undefined;

  if (isBuild) {
    console.log('🚀 Iniciando build do frontend...');
  } else {
    console.log('🚀 Iniciando servidor de desenvolvimento do frontend...');

    const { getConfig } = await import('./src/server/server-load-config');

    config = getConfig();
    const browserCommand = config.BROWSER || process.env.BROWSER;

    if (browserCommand === 'vscode') {
      // Abre no Simple Browser do VS Code
      // VS Code detecta automaticamente URLs localhost e oferece abrir no Simple Browser
      openConfig = true;
    } else if (browserCommand) {
      // Usa o comando customizado do usuário
      openConfig = true;
    } else if (process.env.VSCODE_SIMPLE_BROWSER === 'true') {
      // Fallback: variável de ambiente temporária
      openConfig = true;
    }
  }

  return {
    plugins: [react()],
    // plugins: [react(), express("../server/server.ts")],
    resolve: {
      // alias: {
      //   src: "src",
      // },
    },
    root: './src/client',
    build: {
      outDir: '../../dist/client', // Define o diretório de saída do frontend
      emptyOutDir: true, // Limpa o diretório de saída antes de cada build
    },
    define: config
      ? {
          // Expõe a porta do backend para o cliente poder conectar SSE diretamente (sem proxy)
          __VITE_API_PORT__: JSON.stringify(config.API_PORT),
        }
      : undefined,
    server: config
      ? {
          // Configuração do browser:
          // - false: não abre automaticamente
          // - true: abre no browser padrão (ou VS Code detecta localhost)
          // - string: comando customizado
          open: openConfig,
          port: Number(config.APP_PORT), // Define a porta do frontend
          proxy: {
            '/api': `http://localhost:${config.API_PORT}`,
          },
        }
      : undefined,
  };
});
