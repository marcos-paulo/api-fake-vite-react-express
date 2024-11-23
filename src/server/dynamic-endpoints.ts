import express from "express";
import type { Express } from "express-serve-static-core";
import fs from "fs";
import path from "path";
import {
  isModuleEndpoints,
  ListEndpointModule,
  PromiseModule,
} from "./dynamic-endpoints.types";
import { environmentVariables } from "./server-load-envs";

import type { Endpoint, Endpoints } from "../types/Endpoints";

class ServerEndpoints {
  server: ReturnType<Express["listen"]> | undefined = undefined;
  app?: Express;

  endpoints: Endpoints = { listEndpoints: [] };

  globalJsonConfig: any;
  jsonConfig: any;

  listEndpointModule: ListEndpointModule = [];

  private readonly serverDefaultPrefixApi =
    environmentVariables.SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API;

  private readonly endpointServerPort =
    environmentVariables.SERVER_DYNAMIC_ENDPOINTS_PORT;

  constructor() {
    this.loadConfigFile();
    this.loadSectionJsonConfig();
  }

  private loadConfigFile() {
    try {
      const dados = fs.readFileSync(environmentVariables.PROXY_CONFIG_FILE, {
        encoding: "utf-8",
      });
      this.globalJsonConfig = JSON.parse(dados);
    } catch (error) {
      console.error(
        `\x1b[31mErro ao ler o arquivo de configuração ${environmentVariables.PROXY_CONFIG_FILE}.\x1b[0m`,
        error
      );
    }
  }

  private loadSectionJsonConfig() {
    let propriedade = "";
    const keys = environmentVariables.PROXY_CONFIG_FILE_ADDRESS_KEY.split(",");
    let acc = this.globalJsonConfig;

    for (const cur of keys) {
      propriedade = cur;
      if (!acc[cur]) {
        const m = `\x1b[31mNão foi possível ler a propriedade (${propriedade}) do arquivo de configuração.\x1b[0m`;
        console.error(m);
        process.exit(1);
      }
      acc = acc[cur];
    }

    this.jsonConfig = acc;
  }

  private saveConfigFile() {
    try {
      fs.writeFileSync(
        environmentVariables.PROXY_CONFIG_FILE,
        JSON.stringify(this.globalJsonConfig, null, 2)
      );
    } catch (error) {
      console.error(
        `\x1b[31mErro ao salvar o arquivo de configuração ${environmentVariables.PROXY_CONFIG_FILE}.\x1b[0m`,
        error
      );
    }
  }

  async changeStateEndpoint(endpoint: Endpoint) {
    const values = JSON.stringify(this.jsonConfig);

    const { serverAddress, localhostAddress } = endpoint;
    const value = `"${serverAddress}":"${localhostAddress}"`;

    console.log("serverAddress", serverAddress);
    console.log("localhostAddress", localhostAddress);

    if (!values.includes(value)) {
      this.jsonConfig[serverAddress] = localhostAddress;
      this.saveConfigFile();
    } else {
      delete this.jsonConfig[serverAddress];
      this.saveConfigFile();
    }

    await this.closeServer();
    await this.activeServer();
  }

  async importarEndpoints() {
    this.endpoints.listEndpoints = [];

    this.listEndpointModule = [];

    const listImportedModules: PromiseModule[] = [];

    const dirname = process.cwd();
    const pathEndpointDirectory = path.join(dirname, "src/server/endpoints");
    const pathModuleNames = fs.readdirSync(pathEndpointDirectory);

    for (const pathModule of pathModuleNames) {
      const moduleFile = `./endpoints/${pathModule}`;
      const importedModule: PromiseModule = import(moduleFile);

      listImportedModules.push(importedModule);
    }

    const resolvedList = await Promise.all(listImportedModules);

    for (const resolved of resolvedList) {
      this.listEndpointModule.push(...resolved.default);
    }
  }

  loadEndpointsOnServer(app: Express) {
    this.endpoints.listEndpoints = [];

    const values = JSON.stringify(this.jsonConfig);

    for (const EndpointModule of this.listEndpointModule) {
      const { localhostEndpoint, handler, method, endpointServerPrefix } =
        EndpointModule;

      // define a chave que será usada para armazenar o endpoint no objeto de configuração
      let serverAddress = "";
      if (endpointServerPrefix) {
        serverAddress = path.join(endpointServerPrefix, localhostEndpoint);
      } else {
        serverAddress = path.join(
          this.serverDefaultPrefixApi,
          localhostEndpoint
        );
      }

      const localhostAddress = `http://${path.join(
        `localhost:${this.endpointServerPort}`,
        localhostEndpoint
      )}`;

      const valueObject = `"${serverAddress}":"${localhostAddress}"`;
      const enabled = values.includes(valueObject);

      if (enabled) {
        app[method](localhostEndpoint, handler);
      }

      console.log("valueObject", valueObject);
      this.endpoints.listEndpoints.push({
        serverAddress,
        localhostAddress,
        method,
        enabled,
      });
    }
  }

  async activeServer() {
    await new Promise<void>((resolve) => {
      if (this.app || this.server) {
        console.log("\x1b[33mServer already running\x1b[0m");
        setTimeout(() => {
          resolve();
        }, 0);
        return;
      }

      this.app = express();

      this.loadEndpointsOnServer(this.app);

      this.server = this.app.listen(
        environmentVariables.SERVER_DYNAMIC_ENDPOINTS_PORT,
        () => {
          console.log("\x1b[32mServer is running on port 3001\x1b[0m");
          setTimeout(() => {
            resolve();
          }, 0);
        }
      );
    });
  }

  async closeServer() {
    type StatusServer = "error" | "closed" | "ok";
    await new Promise<StatusServer>((resolve) => {
      console.log("Closing server");
      if (!this.server) {
        resolve("closed");
        return;
      }
      this.server.close((error) => {
        if (error) {
          console.error("\x1b[31mError on close server\x1b[0m", error);
          resolve("error");
        } else {
          resolve("ok");
        }
      });
    }).then((value) => {
      switch (value) {
        case "error":
          console.log("\x1b[31mError on close server\x1b[0m");
          break;
        case "closed":
          console.log("\x1b[31mServer not running\x1b[0m");
          break;
        case "ok":
          console.log("\x1b[32mServer closed\x1b[0m");
          break;
        default:
          console.log("\x1b[33mServer not running\x1b[0m");
          break;
      }

      this.server = undefined;
      this.app = undefined;
    });
  }
}

let endpointsServer: ServerEndpoints;

export async function createServerEndpointsManager() {
  endpointsServer = new ServerEndpoints();
  await endpointsServer.importarEndpoints();
}

export { endpointsServer };
