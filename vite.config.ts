import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import { getEnvironmentVariables } from "./src/server/server-load-envs";

import express from "./express-plugin";

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), express("../server/server.ts")],
    resolve: {
      // alias: {
      //   src: "src",
      // },
    },
    root: "./src/client",
    build: {
      outDir: "./dist/client", // Define o diretório de saída do frontend
    },
    server: {
      open: true, // Abre o navegador automaticamente
      port: Number(getEnvironmentVariables().CLIENT_APP_PORT), // Define a porta do frontend
      proxy: {
        // "/api": `http://localhost:${environmentVariables.CLIENT_API_PORT}`, // Define o proxy para a API
      },
    },
  };
});
