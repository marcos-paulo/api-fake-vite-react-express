import { config } from "dotenv";
// import "dotenv/config";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import {
  environmentVariables,
  loadEnvVariables,
} from "./src/server/server-load-envs";

import { startServer } from "./src/server/server";
import path from "path";

config({ path: path.resolve(__dirname, "./myEndpoints/.env") });
loadEnvVariables();

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    {
      name: "vite-plugin-backend",
      configureServer: async () => {
        await startServer();
        // Iniciar o subprocesso
        // startSubprocess();
        // // Inicializa o backend durante o desenvolvimento
        // const serverProcess = spawn("tsx", ["src/server/server.ts"], {
        //   stdio: "inherit",
        //   shell: true,
        // });
        // serverProcess.on("close", (code) => {
        //   console.log("");
        //   console.log(`Servidor backend encerrado com código ${code}`);
        //   process.exit(code);
        // });
      },
    },
  ],
  resolve: {
    // alias: {
    //   src: "src",
    // },
  },
  root: "./src/client",
  build: {
    outDir: "./public", // Define o diretório de saída do frontend
  },
  server: {
    open: true, // Abre o navegador automaticamente
    port: Number(environmentVariables.CLIENT_APP_PORT), // Define a porta do frontend
    proxy: {
      "/api": `http://localhost:${environmentVariables.CLIENT_API_PORT}`, // Define o proxy para a API
    },
  },
});
