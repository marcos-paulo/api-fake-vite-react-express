import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { spawn } from "child_process";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "vite-plugin-backend",
      configureServer() {
        // Inicializa o backend durante o desenvolvimento
        const serverProcess = spawn("tsx", ["src/server/server.ts"], {
          stdio: "inherit",
          shell: true,
        });

        serverProcess.on("close", (code) => {
          console.log(`Servidor backend encerrado com código ${code}`);
          process.exit(code);
        });
      },
    },
  ],
  root: "./src/client",
  build: {
    outDir: "./public", // Define o diretório de saída do frontend
  },
  server: {
    proxy: {
      "/api": "http://localhost:3343", // Define o proxy para a API
    },
  },
});
