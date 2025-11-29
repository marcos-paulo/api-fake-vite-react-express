import express from "express";

import {
  createServerEndpointsManager,
  endpointsServer,
} from "./dynamic-endpoints";
import { getEnvironmentVariables } from "./server-load-envs";

import { Endpoint } from "../types/Endpoints";

export const app = express();

const CLIENT_APP_PORT = getEnvironmentVariables().CLIENT_API_PORT ?? 3000;

await createServerEndpointsManager();

app.use(express.json());

app.get("/api/endpoints", async (_req, res) => {
  const endpoints = await endpointsServer.getEndpoints();
  res.json(endpoints);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.post<any, any, "", Endpoint>(
  "/api/changeStateEndpoint",
  async (req, res, next) => {
    console.log("REQUEST: /api/changeStateEndpoint", req.body);
    try {
      const endpoint = req.body;
      await endpointsServer.changeStateEndpoint(endpoint);
      res.status(200).send("");
    } catch (error) {
      next({ error, status: 400 });
    }
  }
);

app.post("/api/disable", async (_req, res) => {
  endpointsServer.disableAllEndpoints();
  res.status(200).send("");
});

app.post("/api/shutdown", async (_req, res) => {
  res.status(200).send("");
  process.exit(0);
});

// REDIRECIONA PARA OS ENDPOINTS DINÂMICOS
app.use((req, res) => {
  console.info("\x1b[36mFAKE API REQUEST: %s\x1b[0m", req.path);

  const enabledEndpoint = endpointsServer.listEnabledEndpointModule.find(
    (endpointModule) => endpointModule.localhostEndpoint === req.path
  );

  if (enabledEndpoint) {
    console.log(
      `Encaminhando requisição para endpoint dinâmico em: %s`,
      enabledEndpoint.localhostEndpoint
    );
    return enabledEndpoint.handler(req, res);
  }

  console.warn("\x1b[33mEndpoint não encontrado: %s\x1b[0m", req.path);
  console.warn("Endpoints habilitados:");
  endpointsServer.listEnabledEndpointModule.forEach((endpointModule) => {
    console.log(" - %s", endpointModule.localhostEndpoint);
  });

  return res.status(404).send("");
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

if (!process.env["VITE"]) {
  const frontendFiles = process.cwd() + "/dist";
  app.use(express.static(frontendFiles));
}

app.listen(CLIENT_APP_PORT, (error) => {
  if (error) {
    console.error("Error to start server express", error);
    throw error;
  }
  console.log(`Server is running at http://localhost:${CLIENT_APP_PORT}`);
});
