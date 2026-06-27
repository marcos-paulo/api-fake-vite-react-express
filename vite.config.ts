import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

import { getConfig } from './src/server/server-load-config';

// https://vite.dev/config/
export default defineConfig(() => {
  const config = getConfig();
  const browserCommand = config.BROWSER || process.env.BROWSER;
  const browserArgs = config.BROWSER_ARGS?.split(' ').filter(Boolean) || [];

  // Determina como abrir o browser
  let openConfig: boolean | string = false;

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
    define: {
      // Expõe a porta do backend para o cliente poder conectar SSE diretamente (sem proxy)
      __VITE_API_PORT__: JSON.stringify(config.CLIENT_API_PORT),
    },
    server: {
      // Configuração do browser:
      // - false: não abre automaticamente
      // - true: abre no browser padrão (ou VS Code detecta localhost)
      // - string: comando customizado
      open: openConfig,
      port: Number(config.CLIENT_APP_PORT), // Define a porta do frontend
      proxy: {
        '/api': `http://localhost:${config.CLIENT_API_PORT}`,
      },
    },
  };
});
