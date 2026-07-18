import fs from 'fs';
import path from 'path';

import {
  type EnabledEndpointRecord,
  type EndpointObject,
  isEndpointObject,
  type LoadedModule,
  type ModuleEndpoint,
} from '../types/dynamic-endpoints.types';
import type { Endpoint, Endpoints } from '../types/endpoints.types';
import { registerEndpointModuleResolver } from './endpoint-module-resolver';
import { LoadingGate } from './loading-gate';
import { logger as appLogger } from './logger';
import { configValidators, getConfig } from './server-load-config';

registerEndpointModuleResolver();

class ServerEndpoints {
  endpoints: Endpoints = { listEndpoints: [] };

  enabledAddresses: EnabledEndpointRecord[] = [];

  globalJsonConfig: Record<string, unknown> = {};

  jsonConfig: Record<string, unknown> = {};

  loadedModules: LoadedModule[] = [];

  enabledEndpointModules: EndpointObject[] = [];

  private reloadListener: (() => void) | undefined;

  onReload(callback: () => void) {
    this.reloadListener = callback;
  }

  private notifyReload() {
    this.reloadListener?.();
  }

  private readonly envs = {
    serverDefaultPrefixApi: getConfig().SERVER_DYNAMIC_ENDPOINTS_DEFAULT_PREFIX_API,
    endpointServerPort: getConfig().API_PORT,
    workspacesRootPath: getConfig().WORKSPACES_ROOT_PATH,
    activeWorkspace: getConfig().ACTIVE_WORKSPACE,
    proxyConfigFile: getConfig().PROXY_CONFIG_FILE,
    proxyConfigFileAddressKey: getConfig().PROXY_CONFIG_FILE_ADDRESS_KEY,
  };

  private readonly workspacePath = path.resolve(
    this.envs.workspacesRootPath,
    this.envs.activeWorkspace,
  );

  private readonly initialEnabledEndpointsFilePath = path.join(
    this.workspacePath,
    'initialEnabledEndpoints.json',
  );

  private logger = appLogger;

  private loadingGate = new LoadingGate();

  private endpointsDirWatchDebounce: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const log = this.logger.startSection('ServerEndpoints - constructor', true);
    log.step('Inicializando observadores de arquivos');
    this.initializeWatchers();
    log.endSection();
  }

  private initializeWatchers() {
    const log = this.logger.startSection('initializeWatchers');
    this.initializeProxyConfigWatcher();
    this.initializeEndpointsDirectoryWatcher();
    log.endSection();
  }

  private initializeProxyConfigWatcher() {
    const log = this.logger.startSection('initializeProxyConfigWatcher');

    log.step('Observando arquivo de configuração do proxy para alterações');
    log.info('Arquivo de configuração do proxy: ' + this.envs.proxyConfigFile);
    fs.watchFile(this.envs.proxyConfigFile, () => {
      this.handleProxyConfigFileChange().catch((error) => {
        const errorLog = this.logger.logToSection('initializeProxyConfigWatcher - unhandledError');
        errorLog.error('Erro inesperado ao processar alteração no arquivo de proxy', error);
        errorLog.endSection();
      });
    });
    log.endSection();
  }

  private initializeEndpointsDirectoryWatcher() {
    const log = this.logger.startSection('initializeEndpointsDirectoryWatcher');

    const endpointsDir = path.join(this.workspacePath, 'endpoints');
    log.step('Observando diretório de endpoints para alterações');
    log.info('Diretório de endpoints: ' + endpointsDir);
    if (!fs.existsSync(endpointsDir)) {
      fs.mkdirSync(endpointsDir, { recursive: true });
    }
    fs.watch(endpointsDir, (_eventType, filename) => {
      if (!filename || !/\.(ts|js)$/.test(filename)) {
        log.info(`[WATCHER] Ignorado (não é .ts/.js): ${filename}`);
        return;
      }
      clearTimeout(this.endpointsDirWatchDebounce);
      this.endpointsDirWatchDebounce = setTimeout(async () => {
        await this.handleEndpointFileChange(filename);
      }, 500);
    });

    log.endSection();
  }

  private async handleProxyConfigFileChange() {
    const log = this.logger.startSection('ServerEndpoints - onProxyFileChange');
    log.step('Arquivo de configuração do proxy foi modificado, recarregando endpoints');
    log.info(this.envs.proxyConfigFile);

    try {
      await this.loadingGate.run(async () => {
        log.step('Recarregando endpoints');
        await this.loadEndpoints();
      });

      this.notifyReload();
    } catch (error) {
      log.error('Falha ao recarregar endpoints', error);
    } finally {
      log.endSection();
    }
  }

  private async handleEndpointFileChange(filename: string) {
    const log = this.logger.startSection('ServerEndpoints - onEndpointFileChange');
    log.step(`Arquivo de endpoint modificado: ${filename}`);

    try {
      await this.loadingGate.run(async () => {
        await this.reloadEndpointModules();
      });

      this.notifyReload();
      log.success('Reload concluído com sucesso');
    } catch (error) {
      log.error('Falha ao recarregar módulos de endpoint', error);
    } finally {
      log.endSection();
    }
  }

  private async reloadEndpointModules() {
    const log = this.logger.startSection('reloadEndpointModules');

    log.step('Reimportando módulos de endpoints (com cache-busting)');
    await this.importEndpointModules(true);

    log.step('Construindo lista de endpoints habilitados');
    this.buildEnabledEndpointList();

    log.step('Detectando duplicatas de endereços');
    this.detectDuplicateEndpoints();

    log.step('Salvando arquivo de configuração');
    this.saveConfigFile();

    log.endSection();
  }

  async getEndpoints() {
    const log = this.logger.startSection('ServerEndpoints - getEndpoints', true);
    const id = Date.now();
    log.step(`Aguardando carregamento dos endpoints (id: ${id})`);
    await this.loadingGate.wait();
    log.info(`Carregamento dos endpoints concluído (id: ${id})`);
    log.endSection();
    return this.endpoints;
  }

  async beginLoading() {
    const log = this.logger.startSection('ServerEndpoints - beginLoading', true);
    log.step('Habilitando trava de resposta de endpoints enquanto estão sendo carregados');
    await this.loadingGate.run(async () => {
      log.step('Carregando endpoints');
      await this.loadEndpoints();
    });
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

    log.step('Detectando duplicatas de endereços');
    this.detectDuplicateEndpoints();

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

    const parsed = JSON.parse(initial) as EnabledEndpointRecord[] | string[];

    if (!Array.isArray(parsed)) {
      this.enabledAddresses = [];
      log.endSection();
      return;
    }

    // suporte ao formato legado (string[])
    if (parsed.length > 0 && typeof parsed[0] === 'string') {
      this.enabledAddresses = (parsed as string[])
        .filter((entry) => /\.(ts|js)$/i.test(entry))
        .map((fileName) => ({ fileName: fileName.trim() }));

      const ignoredLegacyEntries = (parsed as string[]).filter(
        (entry) => !/\.(ts|js)$/i.test(entry),
      );
      if (ignoredLegacyEntries.length > 0) {
        log.warn(
          `Entradas legadas sem fileName foram ignoradas: ${ignoredLegacyEntries.join(', ')}`,
        );
      }
    } else {
      this.enabledAddresses = (parsed as EnabledEndpointRecord[])
        .filter((record) => !!record?.fileName)
        .map((record) => ({
          fileName: record.fileName.trim(),
        }));
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
      configValidators
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

    const loadedFileNames = new Set(this.loadedModules.map((m) => m.fileName));
    this.enabledAddresses = this.enabledAddresses.filter((record) =>
      loadedFileNames.has(record.fileName),
    );

    const enabledFileNames = new Set(this.enabledAddresses.map((r) => r.fileName));
    const newEnabledAddresses: EnabledEndpointRecord[] = [];

    // Construir lista de endpoints
    for (const { endpoint, fileName, loadError } of this.loadedModules) {
      const enabled = enabledFileNames.has(fileName);

      if (loadError || !endpoint) {
        this.endpoints.listEndpoints.push({
          description: '',
          serverAddress: '',
          localhostAddress: '',
          method: 'get',
          tags: [],
          enabled,
          fileName,
          loadError: true,
          isDuplicate: false,
          duplicateFiles: [],
        });

        if (enabled) {
          newEnabledAddresses.push({ fileName });
        }

        continue;
      }

      const { description, localhostEndpoint, method, endpointServerPrefix } = endpoint;
      const tags = Array.isArray(endpoint.tags)
        ? endpoint.tags
            .filter((tag): tag is string => typeof tag === 'string')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      const serverPrefixApi = endpointServerPrefix
        ? endpointServerPrefix
        : this.envs.serverDefaultPrefixApi;

      const serverAddress = path.join(serverPrefixApi, localhostEndpoint);

      // prettier-ignore
      const localhostAddress = `http://${path.join(`localhost:${this.envs.endpointServerPort}`,localhostEndpoint)}`;

      delete this.jsonConfig[serverAddress];

      if (enabled) {
        this.enabledEndpointModules.push(endpoint);
        this.jsonConfig[serverAddress] = localhostAddress;
        newEnabledAddresses.push({ fileName });
      }

      this.endpoints.listEndpoints.push({
        description,
        serverAddress,
        localhostAddress,
        method,
        tags,
        enabled,
        fileName,
        loadError: false,
        isDuplicate: false,
        duplicateFiles: [],
      });
    }

    this.enabledAddresses = newEnabledAddresses;
    log.endSection();
  }

  private detectDuplicateEndpoints(): void {
    const log = this.logger.startSection('detectDuplicateEndpoints');

    const serverAddressMap = new Map<string, string[]>();

    // Mapear todos os serverAddresses para seus fileNames
    for (const { endpoint, fileName, loadError } of this.loadedModules) {
      if (!loadError && endpoint) {
        const { localhostEndpoint, endpointServerPrefix } = endpoint;
        const serverPrefixApi = endpointServerPrefix
          ? endpointServerPrefix
          : this.envs.serverDefaultPrefixApi;
        const serverAddress = path.join(serverPrefixApi, localhostEndpoint);

        let filesForAddress = serverAddressMap.get(serverAddress);
        if (!filesForAddress) {
          filesForAddress = [];
          serverAddressMap.set(serverAddress, filesForAddress);
        }
        filesForAddress.push(fileName);
      }
    }

    // Atribuir isDuplicate e duplicateFiles diretamente aos endpoints da lista
    for (const endpoint of this.endpoints.listEndpoints) {
      if (!endpoint.loadError && endpoint.serverAddress) {
        const duplicateFiles = serverAddressMap.get(endpoint.serverAddress) || [];
        const isDuplicate = duplicateFiles.length > 1;

        endpoint.isDuplicate = isDuplicate;
        endpoint.duplicateFiles = duplicateFiles;

        if (isDuplicate) {
          const filesStr = duplicateFiles.filter((f) => f !== endpoint.fileName).join(', ');
          log.warn(
            `🔁 ${endpoint.fileName}: Endereço do servidor duplicado: "${endpoint.serverAddress}" está em: ${filesStr}`,
          );
        }
      }
    }

    log.endSection();
  }

  private saveConfigFile(
    jsonConfigData?: Record<string, unknown>,
    initialEnabledEndpoints?: EnabledEndpointRecord[],
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

      const { serverAddress, localhostAddress, fileName } = endpoint;

      const isEnabled = this.enabledAddresses.some((record) => record.fileName === fileName);

      if (!isEnabled) {
        this.enableEndpoint(fileName, serverAddress, localhostAddress);
      } else {
        this.disableEndpoint(fileName, serverAddress);
      }
    }

    this.buildEnabledEndpointList();
    this.detectDuplicateEndpoints();

    this.saveConfigFile();

    log.endSection();
  }

  private enableEndpoint(fileName: string, serverAddress: string, localhostAddress: string) {
    const log = this.logger.startSection('enableEndpoint');
    log.info(serverAddress);

    if (!fileName.trim()) {
      throw new Error(`fileName inválido para habilitar endpoint: ${serverAddress}`);
    }

    this.enabledAddresses = this.enabledAddresses.filter((record) => record.fileName !== fileName);
    this.jsonConfig[serverAddress] = localhostAddress;
    this.enabledAddresses.push({ fileName: fileName.trim() });
    log.endSection();
  }

  private disableEndpoint(fileName: string, serverAddress: string) {
    const log = this.logger.startSection('disableEndpoint');
    log.info(serverAddress);
    delete this.jsonConfig[serverAddress];
    const index = this.enabledAddresses.findIndex((r) => r.fileName === fileName);
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

    this.enabledAddresses = [];

    this.buildEnabledEndpointList();
    this.detectDuplicateEndpoints();
    this.saveConfigFile();

    log.endSection();
  }

  clearProxyEndpointsOnShutdown() {
    const log = this.logger.startSection('clearProxyEndpointsOnShutdown');

    for (const endpoint of this.endpoints.listEndpoints) {
      if (!endpoint.serverAddress) {
        continue;
      }

      delete this.jsonConfig[endpoint.serverAddress];
    }

    this.saveConfigFile(this.globalJsonConfig, this.enabledAddresses);

    log.endSection();
  }

  private async importEndpointModules(bustCache = false) {
    const log = this.logger.startSection('importEndpointModules');

    // para usar o fs.readdirSync é necessário usar o caminho absoluto
    const basePath = path.join(this.workspacePath, 'endpoints');
    const resolvedDir = path.resolve(basePath);

    this.loadedModules = [];

    log.step('Lendo arquivos do diretório de endpoints');
    log.info(`Diretório de endpoints: ${resolvedDir}`);

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

    files.sort();

    const listImportedModules: LoadedModule[] = [];
    for (const fileName of files) {
      const [, file, ext] = fileName.match(/(.*)\.(t|j)(s)$/) || [];

      const uri = path.join(this.workspacePath, `endpoints/${file}.${ext}s`);
      const importUri = bustCache ? `${uri}?t=${Date.now()}` : uri;

      try {
        const importedModule = (await import(importUri)) as Partial<ModuleEndpoint>;

        if (!isEndpointObject(importedModule.endpoint)) {
          throw new Error(
            `Módulo inválido: ${fileName}. Esperado export const endpoint: EndpointObject`,
          );
        }

        log.success(uri);

        listImportedModules.push({ endpoint: importedModule.endpoint, fileName, loadError: false });
      } catch (e) {
        const error = e as Error;
        log.error(`Falha ao importar módulo de endpoint: ${fileName}`);
        log.error(importUri);
        log.error(error.toString());
        listImportedModules.push({ endpoint: null, fileName, loadError: true });
      }
    }

    this.loadedModules = listImportedModules;

    this.logger.endSection();
  }
}

export function createServerEndpointsManager() {
  endpointsServer = new ServerEndpoints();
}

export function startServerEndpointsManager() {
  if (!endpointsServer) {
    createServerEndpointsManager();
  }

  endpointsServer.beginLoading().catch((error) => {
    const log = appLogger.logToSection('createServerEndpointsManager - unhandledError');
    log.error('Erro inesperado ao iniciar o carregamento dos endpoints', error);
    log.endSection();
  });
}

let endpointsServer: ServerEndpoints;

export { endpointsServer };
