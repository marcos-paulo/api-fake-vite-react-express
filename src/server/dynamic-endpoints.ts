import fs from 'fs';
import path from 'path';
import { EndpointObject, ModuleEndpoint } from './dynamic-endpoints.types';
import { envValidators, getEnvironmentVariables } from './server-load-envs';

import type { Endpoint, Endpoints } from '../types/Endpoints';

// ─── Logger ──────────────────────────────────────────────────────────────────

const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';

function createLogger(methodName: string, level: number) {
  const spaces = ' '.repeat(level * 2);

  const header = (context?: string) => {
    const ctx = context ? ` ${context}` : '';
    console.info(`${spaces}${CYAN}[${methodName}]${ctx}${RESET}`);
  };

  return {
    header,
    step: (message: string) => console.info(`${spaces}  ${MAGENTA}◆ ${message}${RESET}`),
    info: (message: string) => console.info(`${spaces}  → ${message}`),
    warn: (message: string) => console.warn(`${spaces}  → ${message}`),
    error: (message: string, cause?: unknown) =>
      console.error(`${spaces}  → ${message}`, ...(cause !== undefined ? [cause] : [])),
  };
}

class ServerEndpoints {
  endpoints: Endpoints = { listEndpoints: [] };

  enabledAddresses: string[] = [];

  globalJsonConfig: Record<string, unknown> = {};
  jsonConfig: Record<string, unknown> = {};

  endpointModules: EndpointObject[] = [];

  enabledEndpointModules: EndpointObject[] = [];

  private readonly serverDefaultPrefixApi =
    getEnvironmentVariables().SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API;

  private readonly endpointServerPort = getEnvironmentVariables().CLIENT_API_PORT;

  private readonly endpointsWorkspaceDirectory =
    getEnvironmentVariables().WORKSPACE_ENDPOINTS_DIRECTORY;

  private readonly proxyConfigFile = getEnvironmentVariables().PROXY_CONFIG_FILE;

  private readonly proxyConfigFileAddressKey =
    getEnvironmentVariables().PROXY_CONFIG_FILE_ADDRESS_KEY;

  private readonly initialEnabledEndpointsFilePath = `./root-endpoints/${this.endpointsWorkspaceDirectory}/initialEnabledEndpoints.json`;

  private static _resolveLoading: () => void = () => {};

  private static loading: Promise<void> | undefined;

  constructor() {
    this.enableLoading();

    fs.watchFile(this.proxyConfigFile, async () => {
      const log = createLogger('onProxyFileChange', 1);
      log.header(this.proxyConfigFile);

      try {
        await this.loadEndpoints();
        this.resolveLoading();
      } catch (error) {
        log.error('Falha ao recarregar endpoints', error);
      }
    });
  }

  private enableLoading() {
    const log = createLogger('enableLoading', 1);
    log.header();
    ServerEndpoints.loading = new Promise<void>((resolve) => {
      ServerEndpoints._resolveLoading = resolve;
    });
  }

  async getEndpoints() {
    const log = createLogger('getEndpoints', 1);
    log.header();
    await ServerEndpoints.loading;
    return this.endpoints;
  }

  resolveLoading() {
    const log = createLogger('resolveLoading', 1);
    log.header();
    ServerEndpoints._resolveLoading();
    ServerEndpoints._resolveLoading = () => {};
    ServerEndpoints.loading = undefined;
  }

  async loadEndpoints() {
    const log = createLogger('loadEndpoints', 0);
    log.header();

    log.step('Carregando configuração do proxy');
    const configFileChanged = this.loadProxyConfig();

    if (!configFileChanged) return false;

    log.step('Carregando endereços habilitados');
    this.loadEnabledEndpointsFile();

    log.step('Resolvendo rotas do proxy');
    this.resolveProxyRoutes();

    log.step('Importando módulos de endpoints');
    await this.importEndpointModules();

    log.step('Construindo lista de endpoints habilitados');
    this.buildEnabledEndpointList();

    log.step('Salvando configuração');
    this.saveConfigFile();

    return true;
  }

  private loadEnabledEndpointsFile() {
    const log = createLogger('loadEnabledEndpointsFile', 1);
    log.header();

    if (!fs.existsSync(this.initialEnabledEndpointsFilePath)) {
      fs.writeFileSync(this.initialEnabledEndpointsFilePath, '[]');
    }

    const initial = fs.readFileSync(this.initialEnabledEndpointsFilePath, {
      encoding: 'utf-8',
    });

    const initialEndpoints = JSON.parse(initial) as string[];

    if (Array.isArray(initialEndpoints)) {
      this.enabledAddresses = initialEndpoints;
    } else {
      this.enabledAddresses = [];
    }
  }

  /**
   * @returns {boolean} Retorna true se houve alguma alteração no arquivo em relação aos dados que
   * foram lidos anteriormente, e retorna false se não houve alteração ou se houve algum erro ao ler o arquivo.
   */
  private loadProxyConfig(): boolean {
    const log = createLogger('loadProxyConfig', 1);
    log.header();

    try {
      const jsonConfigString = fs.readFileSync(this.proxyConfigFile, {
        encoding: 'utf-8',
      });

      const currentGlobalJsonConfig = JSON.stringify(this.globalJsonConfig, null, 2);

      if (currentGlobalJsonConfig === jsonConfigString) {
        log.info('Arquivo de configuração não foi alterado');
        return false;
      } else {
        log.warn('Arquivo de configuração foi alterado');
      }

      this.globalJsonConfig = JSON.parse(jsonConfigString);

      return true;
    } catch (error) {
      log.error(`Erro ao ler o arquivo de configuração: ${this.proxyConfigFile}`, error);

      return false;
    }
  }

  private resolveProxyRoutes() {
    const log = createLogger('resolveProxyRoutes', 1);
    log.header();

    const keys = this.proxyConfigFileAddressKey.split(',');

    const objectConfig = keys.reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object' && key in obj) {
        return (obj as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }, this.globalJsonConfig);

    if (!objectConfig) {
      envValidators
        .PROXY_CONFIG_FILE_ADDRESS_KEY()
        .fail(
          `\n\x1b[31mNão foi possível ler a propriedade (${this.proxyConfigFileAddressKey}) do arquivo de configuração.\x1b[0m\n`,
        );
    }

    this.jsonConfig = objectConfig as Record<string, unknown>;
  }

  private buildEnabledEndpointList() {
    const log = createLogger('buildEnabledEndpointList', 1);
    log.header();

    this.endpoints.listEndpoints = [];
    this.enabledEndpointModules = [];

    const newEnabledAddresses: string[] = [];

    for (const endpointModule of this.endpointModules) {
      const { description, localhostEndpoint, method, endpointServerPrefix } = endpointModule;

      const serverPrefixApi = endpointServerPrefix
        ? endpointServerPrefix
        : this.serverDefaultPrefixApi;

      // define a chave que será usada para armazenar o endpoint no objeto de configuração
      const serverAddress = path.join(serverPrefixApi, localhostEndpoint);

      // prettier-ignore
      const localhostAddress = `http://${path.join(`localhost:${this.endpointServerPort}`,localhostEndpoint)}`;

      delete this.jsonConfig[serverAddress];

      const enabled = this.enabledAddresses.includes(serverAddress);

      if (enabled) {
        this.enabledEndpointModules.push(endpointModule);
        this.jsonConfig[serverAddress] = localhostAddress;
        newEnabledAddresses.push(serverAddress);
      }

      this.endpoints.listEndpoints.push({
        description,
        serverAddress,
        localhostAddress,
        method,
        enabled,
      });
    }

    this.enabledAddresses = newEnabledAddresses;
  }

  private saveConfigFile(
    jsonConfigData?: Record<string, unknown>,
    initialEnabledEndpoints?: string[],
  ) {
    const log = createLogger('saveConfigFile', 1);
    log.header();

    try {
      log.info('Salvando arquivo de configuração do proxy');

      const jsonConfig = jsonConfigData || this.globalJsonConfig;
      fs.writeFileSync(this.proxyConfigFile, JSON.stringify(jsonConfig, null, 2));

      log.info('Salvando arquivo de endpoints habilitados');

      const initialEnabledEndpointsData = initialEnabledEndpoints || this.enabledAddresses;
      fs.writeFileSync(
        this.initialEnabledEndpointsFilePath,
        JSON.stringify(initialEnabledEndpointsData, null, 2),
      );
    } catch (error) {
      log.error(`Erro ao salvar os arquivos de configuração: ${this.proxyConfigFile}`, error);
    }
  }

  toggleEndpoints(endpoints: Endpoint[]) {
    for (const endpoint of endpoints) {
      const log = createLogger('toggleEndpoints', 1);
      log.header(endpoint.serverAddress);

      const { serverAddress, localhostAddress } = endpoint;

      if (this.jsonConfig[serverAddress] === undefined) {
        this.enableEndpoint(serverAddress, localhostAddress);
      } else {
        this.disableEndpoint(serverAddress);
      }
    }

    this.buildEnabledEndpointList();

    this.saveConfigFile();
  }

  private enableEndpoint(serverAddress: string, localhostAddress: string) {
    createLogger('enableEndpoint', 1).header(serverAddress);
    this.jsonConfig[serverAddress] = localhostAddress;
    this.enabledAddresses.push(serverAddress);
  }

  private disableEndpoint(serverAddress: string) {
    createLogger('disableEndpoint', 1).header(serverAddress);
    delete this.jsonConfig[serverAddress];
    const index = this.enabledAddresses.indexOf(serverAddress);
    if (index > -1) {
      this.enabledAddresses.splice(index, 1);
    }
  }

  disableAllEndpoints() {
    createLogger('disableAllEndpoints', 1).header();

    for (const endpoint of this.endpoints.listEndpoints) {
      delete this.jsonConfig[endpoint.serverAddress];
    }

    this.buildEnabledEndpointList();
    this.saveConfigFile();
  }

  private async importEndpointModules() {
    const log = createLogger('importEndpointModules', 1);
    log.header();

    // para usar o fs.readdirSync é necessário usar o caminho absoluto
    const basePath = `./root-endpoints/${this.endpointsWorkspaceDirectory}/endpoints`;
    const resolvedDir = path.resolve(basePath);

    this.endpointModules = [];
    let files: string[];

    if (!fs.existsSync(resolvedDir)) {
      log.warn(`Diretório de endpoints não encontrado: ${resolvedDir}`);
      log.info(`Criando diretório: ${basePath}`);
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
      log.error(`Erro ao ler os arquivos do diretório de endpoints: ${resolvedDir}`, error);
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
        log.error(`Erro ao carregar o módulo de endpoint: ${fileName}`, error);
      }
    }

    for (const importedModule of listImportedModules) {
      this.endpointModules.push(...importedModule.default);
    }
  }
}

let endpointsServer: ServerEndpoints;

export async function createServerEndpointsManager() {
  endpointsServer = new ServerEndpoints();
  await endpointsServer.loadEndpoints();
}

export { endpointsServer };
