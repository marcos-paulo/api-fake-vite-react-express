import express from "express";
import type { Express } from "express-serve-static-core";
import fs from "fs";
import path from "path";
import { EndpointObject, ModuleEndpoint } from "./dynamic-endpoints.types";
import { environmentVariables } from "./server-load-envs";

import type { Endpoint, Endpoints } from "../types/Endpoints";

class ServerEndpoints {
  server: ReturnType<Express["listen"]> | undefined = undefined;
  app?: Express;

  endpoints: Endpoints = { listEndpoints: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalJsonConfig: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonConfig: any;

  listEndpointModule: EndpointObject[] = [];
  listEnabledEndpointModule: EndpointObject[] = [];

  private readonly serverDefaultPrefixApi =
    environmentVariables.SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API;

  private readonly endpointServerPort =
    environmentVariables.SERVER_DYNAMIC_ENDPOINTS_PORT;

  constructor() {
    fs.watchFile(environmentVariables.PROXY_CONFIG_FILE, async () => {
      // prettier-ignore
      console.log(`Recarregando arquivo de configuração ${environmentVariables.PROXY_CONFIG_FILE}...`);

      this.loadConfigFile();
      this.loadSectionJsonConfig();
      await this.importEndpointModules();
      this.loadEnabledEndpointModules();

      if (this.server) {
        await this.closeServer();
        await this.activeServer();
      }
    });
  }

  async loadEndpoints() {
    this.loadConfigFile();
    this.loadSectionJsonConfig();
    await this.importEndpointModules();
    this.loadEnabledEndpointModules();
  }

  private loadConfigFile() {
    try {
      const dados = fs.readFileSync(environmentVariables.PROXY_CONFIG_FILE, {
        encoding: "utf-8",
      });
      this.globalJsonConfig = JSON.parse(dados);
    } catch (error) {
      // prettier-ignore
      console.error(`\x1b[31mErro ao ler o arquivo de configuração ${environmentVariables.PROXY_CONFIG_FILE}.\x1b[0m\n`, error);
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

  private loadEnabledEndpointModules() {
    this.endpoints.listEndpoints = [];
    this.listEnabledEndpointModule = [];

    const values = JSON.stringify(this.jsonConfig);

    for (const endpointModule of this.listEndpointModule) {
      const { localhostEndpoint, method, endpointServerPrefix } =
        endpointModule;

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

      // prettier-ignore
      const localhostAddress = `http://${path.join(`localhost:${this.endpointServerPort}`,localhostEndpoint)}`;

      const valueObject = `"${serverAddress}":"${localhostAddress}"`;
      const enabled = values.includes(valueObject);

      if (enabled) {
        this.listEnabledEndpointModule.push(endpointModule);
      }

      this.endpoints.listEndpoints.push({
        serverAddress,
        localhostAddress,
        method,
        enabled,
      });
    }
  }

  private saveConfigFile() {
    try {
      fs.writeFileSync(
        environmentVariables.PROXY_CONFIG_FILE,
        JSON.stringify(this.globalJsonConfig, null, 2)
      );
    } catch (error) {
      // prettier-ignore
      console.error(`\x1b[31mErro ao salvar o arquivo de configuração ${environmentVariables.PROXY_CONFIG_FILE}.\x1b[0m`, error);
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
    } else {
      delete this.jsonConfig[serverAddress];
    }
    this.saveConfigFile();

    await this.closeServer();
    await this.activeServer();
  }

  private async importEndpointModules() {
    // para usar o fs.readdirSync é necessário usar o caminho absoluto
    const basePath = "myEndpoints/endpoints";
    const resolvedDir = path.resolve(basePath);

    this.endpoints.listEndpoints = [];
    this.listEndpointModule = [];
    let files: string[];

    if (!fs.existsSync(resolvedDir)) {
      // prettier-ignore
      console.error(`\x1b[31mDiretório de endpoints não encontrado ${resolvedDir}.\x1b[0m`);
      // prettier-ignore
      console.log(`\x1b[33mCrie o diretório ${basePath} e adicione pelo menos um arquivos de endpoint.\x1b[0m`);
      process.exit(1);
    }

    try {
      files = fs.readdirSync(resolvedDir);
      files.filter((file) => {
        const filePath = path.join(resolvedDir, file);
        // Verifica se é um arquivo e tem extensão .ts ou .js
        return /\.(ts|js)$/.test(filePath);
      });
    } catch (error) {
      // prettier-ignore
      console.error(`\x1b[31mErro ao ler os arquivos do diretório de endpoints ${resolvedDir}.\x1b[0m\n `, error);
      process.exit(1);
    }

    const listImportedModules: ModuleEndpoint[] = [];
    for (const fileName of files) {
      try {
        // para usar o import é necessário usar o caminho relativo, limitação do vite
        const importedModule = await import(
          `../../myEndpoints/endpoints/${fileName}`
        );
        listImportedModules.push(importedModule);
      } catch (error) {
        console.error(`Erro ao carregar o arquivo ${fileName}:`);
        console.error(error);
      }
    }

    for (const importedModule of listImportedModules) {
      this.listEndpointModule.push(...importedModule.default);
    }
  }

  private setEnabledEndpointsOnServer(app: Express) {
    for (const endpointModule of this.listEnabledEndpointModule) {
      const { localhostEndpoint, handler, method } = endpointModule;
      app[method](localhostEndpoint, handler);
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

      this.loadEnabledEndpointModules();
      this.setEnabledEndpointsOnServer(this.app);

      this.server = this.app.listen(
        environmentVariables.SERVER_DYNAMIC_ENDPOINTS_PORT,
        () => {
          console.log(
            `\x1b[32mServer is running on port ${environmentVariables.SERVER_DYNAMIC_ENDPOINTS_PORT}\x1b[0m`
          );
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
  await endpointsServer.loadEndpoints();
}

export { endpointsServer };
