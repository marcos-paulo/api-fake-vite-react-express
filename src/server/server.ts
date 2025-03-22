import express from "express";

import {
  createServerEndpointsManager,
  endpointsServer,
} from "./dynamic-endpoints";
import { environmentVariables } from "./server-load-envs";

import { Endpoint } from "../types/Endpoints";
import type { ServerStatus } from "../types/ServerStatus";

// as variaveis estão sendo inicializadas no arquivo de configuração do vite
// loadEnvVariables();

export async function startServer() {
  await createServerEndpointsManager();

  const app = express();
  const CLIENT_APP_PORT = environmentVariables.CLIENT_API_PORT;

  app.use(express.json());

  app.get("/api/status", (_req, res) => {
    const resp: ServerStatus = {
      activatedServer: !!endpointsServer.server,
    };
    res.json(resp);
  });

  app.get("/api/endpoints", (_req, res) => {
    res.json(endpointsServer.endpoints);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.post<any, any, "", Endpoint>(
    "/api/changeStateEndpoint",
    async (req, res, next) => {
      try {
        const endpoint = req.body;
        await endpointsServer.changeStateEndpoint(endpoint);
        res.status(200).send("");
      } catch (error) {
        next({ error, status: 400 });
      }
    }
  );

  app.post("/api/active", async (_req, res) => {
    await endpointsServer.activeServer();
    res.status(200).send("");
  });

  app.post("/api/disable", async (_req, res) => {
    await endpointsServer.closeServer();
    endpointsServer.disableAllEndpoints();
    res.status(200).send("");
  });

  app.post("/api/shutdown", async (_req, res) => {
    await endpointsServer.closeServer();
    res.status(200).send("");
    process.exit(0);
  });

  app.use(
    (
      err: { error: Error; status: number },
      _req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction
    ) => {
      console.error("teste de erro", err);
      res.status(err.status).send("");
    }
  );

  app.listen(CLIENT_APP_PORT, () => {
    console.log("");
    console.log(`Server is running at http://localhost:${CLIENT_APP_PORT}`);
  });
}
