import fs from "fs";
import path from "path";
import { EndpointObject, ModuleEndpoint } from "./dynamic-endpoints.types";
import {
  environmentValidate,
  getEnvironmentVariables,
} from "./server-load-envs";

import type { Endpoint, Endpoints } from "../types/Endpoints";

class ServerEndpoints {
  endpoints: Endpoints = { listEndpoints: [] };

  enabledInitialEndpoints: string[] = [];

  lastLoadedGlobalJsonConfig: string = "";

  lastLoadedJsonConfig: string = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalJsonConfig: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonConfig: any;

  listEndpointModule: EndpointObject[] = [];

  listEnabledEndpointModule: EndpointObject[] = [];

  private readonly serverDefaultPrefixApi =
    getEnvironmentVariables().SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API;

  private readonly endpointServerPort =
    getEnvironmentVariables().CLIENT_API_PORT;

  private readonly endpointsWorkspaceDirectory =
    getEnvironmentVariables().WORKSPACE_ENDPOINTS_DIRECTORY;

  private readonly initialEnabledEndpointsfilePath = `./root-endpoints/${this.endpointsWorkspaceDirectory}/initailEnabledEndpoints.json`;

  private _resolveLoading: () => void = () => {};

  private loading: Promise<void> | undefined;

  private enableLoading() {
    console.info("\x1b[36m[enableLoading]\x1b[0m");
    this.loading = new Promise<void>((resolve) => {
      this._resolveLoading = resolve;
    });
  }

  async getEndpoints() {
    console.info("\x1b[36m[getEndpoints]\x1b[0m");
    await this.loading;
    return this.endpoints;
  }

  resolveLoading() {
    console.info("\x1b[36m[resolveLoading]\x1b[0m");
    this._resolveLoading();
    this._resolveLoading = () => {};
    this.loading = undefined;
  }

  constructor() {
    this.enableLoading();

    fs.watchFile(getEnvironmentVariables().PROXY_CONFIG_FILE, async () => {
      console.info(
        `\x1b[36m[watchFile] ${
          getEnvironmentVariables().PROXY_CONFIG_FILE
        }...\x1b[0m`
      );

      try {
        await this.loadEndpoints();
        this.resolveLoading();
      } catch (error) {
        console.error(error);
      }
    });
  }

  async loadEndpoints() {
    console.info("\x1b[36m[loadEndpoints]\x1b[0m");

    const configFileChanged = this.readConfigFile();

    if (!configFileChanged) return false;

    this.readInitialEnabledEndpointsFile();

    this.loadSectionJsonConfig();

    await this.importEndpointModules();

    this.creatingListEnabledEndpointModules();

    this.saveConfigFile();

    return true;
  }

  private readInitialEnabledEndpointsFile() {
    console.info("\x1b[36m[readInitialEnabledEndpointsFile]\x1b[0m");

    if (!fs.existsSync(this.initialEnabledEndpointsfilePath)) {
      fs.writeFileSync(this.initialEnabledEndpointsfilePath, "[]");
    }

    const initial = fs.readFileSync(this.initialEnabledEndpointsfilePath, {
      encoding: "utf-8",
    });

    const initialEndpoints = JSON.parse(initial) as string[];

    if (Array.isArray(initialEndpoints)) {
      this.enabledInitialEndpoints = initialEndpoints;
    } else {
      this.enabledInitialEndpoints = [];
    }
  }

  /**
   *
   * @returns {boolean} Retorna true se houve alguma alteração no arquivo em relação aos dados que foram lidos anteriormente, e retorna false se não houve alteração ou se houve algum erro ao ler o arquivo.
   */
  private readConfigFile(): boolean {
    console.info("\x1b[36m[readConfigFile]\x1b[0m");

    try {
      const jsonConfigString = fs.readFileSync(
        getEnvironmentVariables().PROXY_CONFIG_FILE,
        { encoding: "utf-8" }
      );

      const currentGlobalJsonConfig = JSON.stringify(
        this.globalJsonConfig,
        null,
        2
      );

      if (currentGlobalJsonConfig === jsonConfigString) {
        console.info(" - Arquivo de configuração não foi alterado");
        return false;
      } else {
        console.info("\x1b[33m - Arquivo de configuração foi alterado\x1b[0m");
      }

      this.globalJsonConfig = JSON.parse(jsonConfigString);

      return true;
    } catch (error) {
      // prettier-ignore
      console.error(`\x1b[31m - Erro ao ler o arquivo de configuração ${getEnvironmentVariables().PROXY_CONFIG_FILE}.\x1b[0m\n`, error);

      return false;
    }
  }

  private loadSectionJsonConfig() {
    console.info("\x1b[36m[loadSectionJsonConfig]\x1b[0m");

    const keys =
      getEnvironmentVariables().PROXY_CONFIG_FILE_ADDRESS_KEY.split(",");

    const objectConfig = keys.reduce((obj, key) => {
      if (obj && key in obj && typeof obj === "object") {
        return obj[key];
      } else {
        return undefined;
      }
    }, this.globalJsonConfig);

    if (!objectConfig) {
      environmentValidate
        .PROXY_CONFIG_FILE_ADDRESS_KEY()
        .fail(
          `\n\x1b[31mNão foi possível ler a propriedade (${
            getEnvironmentVariables().PROXY_CONFIG_FILE_ADDRESS_KEY
          }) do arquivo de configuração.\x1b[0m\n`
        );
    }

    this.jsonConfig = objectConfig;
  }

  private creatingListEnabledEndpointModules() {
    console.info("\x1b[36m[creatingListEnabledEndpointModules]\x1b[0m");

    this.endpoints.listEndpoints = [];
    this.listEnabledEndpointModule = [];

    const newInitialEnabledEndpoints: string[] = [];

    for (const endpointModule of this.listEndpointModule) {
      const { description, localhostEndpoint, method, endpointServerPrefix } =
        endpointModule;

      const serverPrefixApi = endpointServerPrefix
        ? endpointServerPrefix
        : this.serverDefaultPrefixApi;

      // define a chave que será usada para armazenar o endpoint no objeto de configuração
      const serverAddress = path.join(serverPrefixApi, localhostEndpoint);

      // prettier-ignore
      const localhostAddress = `http://${path.join(`localhost:${this.endpointServerPort}`,localhostEndpoint)}`;

      delete this.jsonConfig[serverAddress];

      const enabled = this.enabledInitialEndpoints.includes(serverAddress);

      if (enabled) {
        this.listEnabledEndpointModule.push(endpointModule);
        this.jsonConfig[serverAddress] = localhostAddress;
        newInitialEnabledEndpoints.push(serverAddress);
      }

      this.endpoints.listEndpoints.push({
        description,
        serverAddress,
        localhostAddress,
        method,
        enabled,
      });
    }

    this.enabledInitialEndpoints = newInitialEnabledEndpoints;
  }

  private saveConfigFile(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsonConfigData?: any,
    initialEnabledEndpoints?: string[]
  ) {
    console.info("\x1b[36m[saveConfigFile]\x1b[0m");

    try {
      console.info(
        `\x1b[33m - Salvando arquivo de configuração de proxy\x1b[0m`
      );

      const jsonConfig = jsonConfigData || this.globalJsonConfig;
      fs.writeFileSync(
        getEnvironmentVariables().PROXY_CONFIG_FILE,
        JSON.stringify(jsonConfig, null, 2)
      );

      console.info(
        `\x1b[33m - Salvando arquivo de endpoints habilitados\x1b[0m`
      );

      const initialEnabledEndpointsData =
        initialEnabledEndpoints || this.enabledInitialEndpoints;
      fs.writeFileSync(
        this.initialEnabledEndpointsfilePath,
        JSON.stringify(initialEnabledEndpointsData, null, 2)
      );
    } catch (error) {
      // prettier-ignore
      console.error(`\x1b[31mErro ao salvar os arquivos de configuração ${getEnvironmentVariables().PROXY_CONFIG_FILE}.\x1b[0m`, error);
    }
  }

  async changeStateEndpoint(endpoint: Endpoint) {
    console.info(
      "\x1b[36m[changeStateEndpoint]\x1b[0m",
      endpoint.serverAddress
    );

    this.enableLoading();

    const values = JSON.stringify(this.jsonConfig);

    const { serverAddress, localhostAddress } = endpoint;
    const value = `"${serverAddress}":"${localhostAddress}"`;

    if (!values.includes(value)) {
      this.enableEndpoint(serverAddress, localhostAddress);
    } else {
      this.disableEndpoint(serverAddress);
    }

    this.creatingListEnabledEndpointModules();

    this.saveConfigFile();
  }

  private enableEndpoint(serverAddress: string, localhostAddress: string) {
    console.info(`\x1b[36m[enableEndpoint]\x1b[0m`, serverAddress);
    this.jsonConfig[serverAddress] = localhostAddress;
    this.enabledInitialEndpoints.push(serverAddress);
  }

  private disableEndpoint(serverAddress: string) {
    console.info(`\x1b[36m[disableEndpoint]\x1b[0m`, serverAddress);
    delete this.jsonConfig[serverAddress];
    const index = this.enabledInitialEndpoints.indexOf(serverAddress);
    if (index > -1) {
      this.enabledInitialEndpoints.splice(index, 1);
    }
  }

  disableAllEndpoints() {
    console.info("\x1b[36m[disableAllEndpoints]\x1b[0m");

    for (const endpoint of this.endpoints.listEndpoints) {
      if (endpoint.enabled) {
        endpoint.enabled = false;
        delete this.jsonConfig[endpoint.serverAddress];
      }
    }
    this.saveConfigFile();
  }

  private async importEndpointModules() {
    console.info("\x1b[36m[importEndpointModules]\x1b[0m");

    // para usar o fs.readdirSync é necessário usar o caminho absoluto
    const basePath = `./root-endpoints/${this.endpointsWorkspaceDirectory}/endpoints`;
    const resolvedDir = path.resolve(basePath);

    this.endpoints.listEndpoints = [];
    this.listEndpointModule = [];
    let files: string[];

    if (!fs.existsSync(resolvedDir)) {
      // prettier-ignore
      console.warn(`\x1b[33mDiretório de endpoints não encontrado ${resolvedDir}.\x1b[0m`);
      console.info(`\x1b[33mCriando diretório ${basePath}...\x1b[0m`);
      fs.mkdirSync(resolvedDir, { recursive: true });
    }

    try {
      files = fs.readdirSync(resolvedDir);
      files = files.filter((file) => {
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
        // para usar o import é necessário usar o caminho relativo ao diretório root definido no vite.config, limitação do vite

        const [, file, ext] = fileName.match(/(.*)\.(t|j)(s)$/) || [];

        const importedModule = await import(
          `../../root-endpoints/${this.endpointsWorkspaceDirectory}/endpoints/${file}.${ext}s`
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
}

let endpointsServer: ServerEndpoints;

export async function createServerEndpointsManager() {
  endpointsServer = new ServerEndpoints();
  await endpointsServer.loadEndpoints();
}

export { endpointsServer };
