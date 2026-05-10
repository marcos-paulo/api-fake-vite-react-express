import fs from 'fs';
import path from 'path';

import type { Endpoint, Endpoints } from '../types/Endpoints';
import { type EndpointObject, type ModuleEndpoint } from './dynamic-endpoints.types';
import { envValidators, getEnvironmentVariables } from './server-load-envs';

// ─── Logger ──────────────────────────────────────────────────────────────────

const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';

class Logger {
  level: number = -1;

  constructor() {}

  private stack: string[] = [];

  addToStack(context: string) {
    this.stack.push(context);
  }

  removeFromStack() {
    this.stack.pop();
  }

  startSection(context: string, isRoot = false) {
    this.addToStack(context);
    const log = this.createLogger(context, isRoot ? 0 : this.stack.length - 1);
    log.header(context);
    return log;
  }

  endSection() {
    this.removeFromStack();
  }

  logToSection(context: string) {
    const log = this.createLogger(context, this.stack.length);
    log.header(context);
    return log;
  }

  createLogger(methodName: string, level: number) {
    const spaces = ' '.repeat(level * 2);

    const header = (context?: string) => {
      console.info(`${spaces}${CYAN}[${methodName}]${RESET}`);
    };

    return {
      header,
      step: (message: string) => console.info(`${spaces} ${MAGENTA}◆ ${message}${RESET}`),
      info: (message: string) => console.info(`${spaces} → ${message}`),
      warn: (message: string) => console.warn(`${spaces} → ${message}`),
      error: (message: string, cause?: unknown) =>
        console.error(`${spaces} → ${message}`, ...(cause !== undefined ? [cause] : [])),
      endSection: () => this.endSection(),
    };
  }
}

class ServerEndpoints {
  endpoints: Endpoints = { listEndpoints: [] };

  enabledAddresses: string[] = [];

  globalJsonConfig: Record<string, unknown> = {};
  jsonConfig: Record<string, unknown> = {};

  endpointModules: EndpointObject[] = [];

  enabledEndpointModules: EndpointObject[] = [];

  private readonly envs = {
    serverDefaultPrefixApi: getEnvironmentVariables().SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API,
    endpointServerPort: getEnvironmentVariables().CLIENT_API_PORT,
    endpointsWorkspaceDirectory: getEnvironmentVariables().WORKSPACE_ENDPOINTS_DIRECTORY,
    proxyConfigFile: getEnvironmentVariables().PROXY_CONFIG_FILE,
    proxyConfigFileAddressKey: getEnvironmentVariables().PROXY_CONFIG_FILE_ADDRESS_KEY,
  };

  private readonly initialEnabledEndpointsFilePath = `./root-endpoints/${this.envs.endpointsWorkspaceDirectory}/initialEnabledEndpoints.json`;

  private static loading: Promise<void> | undefined;

  private static _resolveLoading: () => void = () => {};

  private logger = new Logger();

  constructor() {
    const log = this.logger.startSection('ServerEndpoints - constructor', true);

    log.step('Observando arquivo de configuração do proxy para alterações');
    log.info('Arquivo de configuração do proxy: ' + this.envs.proxyConfigFile);
    fs.watchFile(this.envs.proxyConfigFile, async () => {
      const log = this.logger.startSection('ServerEndpoints - onProxyFileChange');
      log.step('Arquivo de configuração do proxy foi modificado, recarregando endpoints');
      log.info(this.envs.proxyConfigFile);

      try {
        log.step('Recarregando endpoints');
        await this.loadEndpoints();
        log.step('Resolvendo carregamento para liberar respostas dos endpoints');
        this.resolveLoading();
      } catch (error) {
        log.error('Falha ao recarregar endpoints', error);
      } finally {
        log.endSection();
      }
    });

    log.endSection();
  }

  private enableLoading() {
    const log = this.logger.startSection('enableLoading');
    ServerEndpoints.loading = new Promise<void>((resolve) => {
      ServerEndpoints._resolveLoading = resolve;
    });
    log.endSection();
  }

  resolveLoading() {
    const log = this.logger.startSection('resolveLoading');
    ServerEndpoints._resolveLoading();
    ServerEndpoints._resolveLoading = () => {};
    ServerEndpoints.loading = undefined;
    log.endSection();
  }

  async getEndpoints() {
    const log = this.logger.startSection('ServerEndpoints - getEndpoints', true);
    const id = Date.now();
    log.step(`Aguardando carregamento dos endpoints (id: ${id})`);
    await ServerEndpoints.loading;
    log.info(`Carregamento dos endpoints concluído (id: ${id})`);
    log.endSection();
    return this.endpoints;
  }

  async beginLoading() {
    const log = this.logger.startSection('ServerEndpoints - beginLoading', true);
    log.step('Habilitando trava de resposta de endpoints enquanto estão sendo carregados');
    this.enableLoading();
    log.step('Carregando endpoints');
    await this.loadEndpoints();
    log.step('Carregamento dos endpoints concluído');
    log.endSection();
  }

  private async loadEndpoints() {
    const log = this.logger.startSection('loadEndpoints');

    log.step('Carregando configuração do proxy');
    const configFileChanged = this.loadProxyConfig();

    if (!configFileChanged) {
      log.endSection();
      return false;
    }

    log.step('Carregando endereços habilitados');
    this.loadEnabledEndpointsFile();

    log.step('Resolvendo rotas do proxy');
    this.resolveProxyRoutes();

    log.step('Importando módulos de endpoints');
    await this.importEndpointModules();

    log.step('Construindo lista de endpoints habilitados');
    this.buildEnabledEndpointList();

    log.step('Atualizando arquivos de configuração do proxy e endpoints habilitados');
    this.saveConfigFile();

    log.endSection();
    return true;
  }

  private loadEnabledEndpointsFile() {
    const log = this.logger.startSection('loadEnabledEndpointsFile');

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

    log.endSection();
  }

  /**
   * @returns {boolean} Retorna true se houve alguma alteração no arquivo em relação aos dados que
   * foram lidos anteriormente, e retorna false se não houve alteração ou se houve algum erro ao ler o arquivo.
   */
  private loadProxyConfig(): boolean {
    const log = this.logger.startSection('loadProxyConfig');

    try {
      const jsonConfigString = fs.readFileSync(this.envs.proxyConfigFile, {
        encoding: 'utf-8',
      });

      if (Object.keys(this.globalJsonConfig).length === 0) {
        log.info('Arquivo de configuração carregado pela primeira vez');
        this.globalJsonConfig = JSON.parse(jsonConfigString);
        log.endSection();
        return true;
      }

      const currentGlobalJsonConfig = JSON.stringify(this.globalJsonConfig, null, 2);

      if (currentGlobalJsonConfig === jsonConfigString) {
        log.info('Nenhuma configuração foi alterada no arquivo de configuração do proxy');
        log.endSection();
        return false;
      }

      log.warn('Arquivo de configuração do proxy foi alterado');
      this.globalJsonConfig = JSON.parse(jsonConfigString);

      log.endSection();
      return true;
    } catch (error) {
      log.error(`Erro ao ler o arquivo de configuração: ${this.envs.proxyConfigFile}`, error);

      log.endSection();
      return false;
    }
  }

  private resolveProxyRoutes() {
    const log = this.logger.startSection('resolveProxyRoutes');

    const keys = this.envs.proxyConfigFileAddressKey.split(',');

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
          `\n\x1b[31mNão foi possível ler a propriedade (${this.envs.proxyConfigFileAddressKey}) do arquivo de configuração.\x1b[0m\n`,
        );
    }

    this.jsonConfig = objectConfig as Record<string, unknown>;
    log.endSection();
  }

  private buildEnabledEndpointList() {
    const log = this.logger.startSection('buildEnabledEndpointList');

    this.endpoints.listEndpoints = [];
    this.enabledEndpointModules = [];

    const newEnabledAddresses: string[] = [];

    for (const endpointModule of this.endpointModules) {
      const { description, localhostEndpoint, method, endpointServerPrefix } = endpointModule;

      const serverPrefixApi = endpointServerPrefix
        ? endpointServerPrefix
        : this.envs.serverDefaultPrefixApi;

      // define a chave que será usada para armazenar o endpoint no objeto de configuração
      const serverAddress = path.join(serverPrefixApi, localhostEndpoint);

      // prettier-ignore
      const localhostAddress = `http://${path.join(`localhost:${this.envs.endpointServerPort}`,localhostEndpoint)}`;

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
    log.endSection();
  }

  private saveConfigFile(
    jsonConfigData?: Record<string, unknown>,
    initialEnabledEndpoints?: string[],
  ) {
    const log = this.logger.startSection('saveConfigFile');

    try {
      log.info('Salvando arquivo de configuração do proxy');

      const jsonConfig = jsonConfigData || this.globalJsonConfig;
      fs.writeFileSync(this.envs.proxyConfigFile, JSON.stringify(jsonConfig, null, 2));

      log.info('Salvando arquivo de endpoints habilitados');

      const initialEnabledEndpointsData = initialEnabledEndpoints || this.enabledAddresses;
      fs.writeFileSync(
        this.initialEnabledEndpointsFilePath,
        JSON.stringify(initialEnabledEndpointsData, null, 2),
      );
    } catch (error) {
      log.error(`Erro ao salvar os arquivos de configuração: ${this.envs.proxyConfigFile}`, error);
    }

    log.endSection();
  }

  toggleEndpoints(endpoints: Endpoint[]) {
    const log = this.logger.startSection('toggleEndpoints');

    for (const endpoint of endpoints) {
      log.step(`Toggle endpoint: ${endpoint.serverAddress}`);

      const { serverAddress, localhostAddress } = endpoint;

      if (this.jsonConfig[serverAddress] === undefined) {
        this.enableEndpoint(serverAddress, localhostAddress);
      } else {
        this.disableEndpoint(serverAddress);
      }
    }

    this.buildEnabledEndpointList();

    this.saveConfigFile();

    log.endSection();
  }

  private enableEndpoint(serverAddress: string, localhostAddress: string) {
    const log = this.logger.startSection('enableEndpoint');
    log.info(serverAddress);
    this.jsonConfig[serverAddress] = localhostAddress;
    this.enabledAddresses.push(serverAddress);
    log.endSection();
  }

  private disableEndpoint(serverAddress: string) {
    const log = this.logger.startSection('disableEndpoint');
    log.info(serverAddress);
    delete this.jsonConfig[serverAddress];
    const index = this.enabledAddresses.indexOf(serverAddress);
    if (index > -1) {
      this.enabledAddresses.splice(index, 1);
    }
    log.endSection();
  }

  disableAllEndpoints() {
    const log = this.logger.startSection('disableAllEndpoints');

    for (const endpoint of this.endpoints.listEndpoints) {
      delete this.jsonConfig[endpoint.serverAddress];
    }

    this.buildEnabledEndpointList();
    this.saveConfigFile();

    log.endSection();
  }

  private async importEndpointModules() {
    const log = this.logger.startSection('importEndpointModules');

    // para usar o fs.readdirSync é necessário usar o caminho absoluto
    const basePath = `./root-endpoints/${this.envs.endpointsWorkspaceDirectory}/endpoints`;
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
          `../../root-endpoints/${this.envs.endpointsWorkspaceDirectory}/endpoints/${file}.${ext}s`
        );
        listImportedModules.push(importedModule);
      } catch (error) {
        log.error(`Erro ao carregar o módulo de endpoint: ${fileName}`, error);
      }
    }

    for (const importedModule of listImportedModules) {
      this.endpointModules.push(...importedModule.default);
    }

    this.logger.endSection();
  }
}

let endpointsServer: ServerEndpoints;

export async function createServerEndpointsManager() {
  endpointsServer = new ServerEndpoints();
  await endpointsServer.beginLoading();
}

export { endpointsServer };
