import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import {
  createServerEndpointsManager,
  endpointsServer,
} from "./dynamic-endpoints";
import { environmentVariables, loadEnvVariables } from "./server-load-envs";

import type { ServerStatus } from "../types/ServerStatus";
import { Endpoint } from "../types/Endpoints";

loadEnvVariables();
await createServerEndpointsManager();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const CLIENT_APP_PORT = environmentVariables.CLIENT_APP_PORT;

app.use(express.json());

app.get("/api/status", (req, res) => {
  const resp: ServerStatus = {
    activatedServer: !!endpointsServer.server,
  };
  res.json(resp);
});

app.get("/api/endpoints", (req, res) => {
  res.json(endpointsServer.endpoints);
});

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

app.post("/api/active", async (req, res) => {
  await endpointsServer.activeServer();
  res.status(200).send("");
});

app.post("/api/disable", async (req, res) => {
  await endpointsServer.closeServer();
  res.status(200).send("");
});

app.use(
  (
    err: { error: Error; status: number },
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("teste de erro", err);
    res.status(err.status).send("");
  }
);

app.listen(CLIENT_APP_PORT, () => {
  console.log(`Server is running at http://localhost:${CLIENT_APP_PORT}`);
});
