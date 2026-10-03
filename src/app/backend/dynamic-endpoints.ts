import fs from 'fs';
import path from 'path';

import { configValidators, getConfig, getWorkDir } from '../../shared/config';
import {
  type EnabledEndpointRecord,
  type EndpointHandlerEntry,
  type EndpointHandlerFn,
  type EndpointObject,
  getEndpointHandlersMap,
  isEndpointObject,
  type LoadedModule,
  type ModuleEndpoint,
} from '../../types/dynamic-endpoints.types';
import type {
  AgentHandlerState,
  Endpoint,
  Endpoints,
  HandlerOption,
} from '../../types/endpoints.types';
import {
  AgentApprovalStore,
  AgentControlError,
  AgentSelectionStore,
  readHandlerSource,
} from './agent-control';
import { registerEndpointModuleResolver } from './endpoint-module-resolver';
import { LoadingGate } from './loading-gate';
import { appLogger } from './logging/logger-app';

registerEndpointModuleResolver();

class ServerEndpoints {
  endpoints: Endpoints = { listEndpoints: [] };

  enabledAddresses: EnabledEndpointRecord[] = [];

  globalJsonConfig: Record<string, unknown> = {};

  jsonConfig: Record<string, unknown> = {};

  loadedModules: LoadedModule[] = [];

  enabledEndpointModules: { endpoint: EndpointObject; activeHandler: EndpointHandlerFn }[] = [];

  activeHandlerSelections: Record<string, string> = {};

  private reloadListener: (() => void) | undefined;

  onReload(callback: () => void) {
    this.reloadListener = callback;
  }

  private notifyReload() {
    this.reloadListener?.();
  }

  private readonly envs = {
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

  // Fica em .config/api-fake/<workspace> na raiz do consumidor (não dentro do
  // próprio workspace) pra manter todo estado gerado pelo api-fake junto num
  // só lugar, com um subdiretório por workspace pra não misturar o estado de
  // habilitados/handlers ativos entre workspaces diferentes.
  private readonly workspaceConfigDir = path.join(
    getWorkDir(),
    '.config',
    'api-fake',
    this.envs.activeWorkspace,
  );

  private readonly initialEnabledEndpointsFilePath = path.join(
    this.workspaceConfigDir,
    'initialEnabledEndpoints.json',
  );

  private readonly activeHandlersFilePath = path.join(
    this.workspaceConfigDir,
    'activeHandlers.json',
  );

  private readonly agentApprovals = new AgentApprovalStore(
    path.join(this.workspaceConfigDir, 'agentApprovals.json'),
  );

  private readonly agentSelections = new AgentSelectionStore(
    path.join(this.workspaceConfigDir, 'agentSelections.json'),
  );

  private logger = appLogger;

  private loadingGate = new LoadingGate();

  private endpointsDirWatchDebounce: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const log = this.logger.startSection('ServerEndpoints - constructor', true);
    fs.mkdirSync(this.workspaceConfigDir, { recursive: true });
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
    fs.watch(endpointsDir, { recursive: true }, (_eventType, filename) => {
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

    log.step('Carregando seleção de handlers ativos');
    this.loadActiveHandlerSelectionsFile();

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

  private loadActiveHandlerSelectionsFile() {
    const log = this.logger.startSection('loadActiveHandlerSelectionsFile');

    if (!fs.existsSync(this.activeHandlersFilePath)) {
      fs.writeFileSync(this.activeHandlersFilePath, '{}');
    }

    try {
      const raw = fs.readFileSync(this.activeHandlersFilePath, { encoding: 'utf-8' });
      const parsed = JSON.parse(raw) as unknown;

      this.activeHandlerSelections =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, string>)
          : {};
    } catch (error) {
      log.error(`Erro ao ler o arquivo de handlers ativos: ${this.activeHandlersFilePath}`, error);
      this.activeHandlerSelections = {};
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
        // Sem módulo importado não há como saber quais handlers o arquivo declararia.
        // A seleção salva em activeHandlerSelections[fileName] (se houver) NÃO é apagada
        // aqui — volta a valer assim que o arquivo carregar sem erro novamente.
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
          handlerOptions: [],
          activeHandlerKey: '',
          activeHandlerByAgent: false,
        });

        if (enabled) {
          newEnabledAddresses.push({ fileName });
        }

        continue;
      }

      const { description, method } = endpoint;
      const tags = Array.isArray(endpoint.tags)
        ? endpoint.tags
            .filter((tag): tag is string => typeof tag === 'string')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      const serverAddress = endpoint.serverAddress;

      // prettier-ignore
      const localhostAddress = `http://${path.join(`localhost:${this.envs.endpointServerPort}`,endpoint.localhostAddress)}`;

      delete this.jsonConfig[serverAddress];

      const handlersMap = getEndpointHandlersMap(endpoint);
      const handlerKeys = Object.keys(handlersMap);
      const storedHandlerKey = this.activeHandlerSelections[fileName];
      let activeHandlerKey = handlerKeys.includes(storedHandlerKey)
        ? storedHandlerKey
        : handlerKeys[0];

      const handlerOptions: HandlerOption[] = handlerKeys.map((key) => ({
        key,
        description: handlersMap[key].description,
        agentControl: handlersMap[key].agentControl ?? 'denied',
        agentState: this.getAgentHandlerState(fileName, key, handlersMap[key]),
      }));

      // Handler escolhido por agente que deixou de estar aprovado (código editado, aprovação
      // revogada ou flag removida): não segue servindo código sem revisão — volta pra última
      // escolha humana.
      const agentSelection = this.agentSelections.selections[fileName];
      const activeState = handlerOptions.find((option) => option.key === activeHandlerKey);
      if (agentSelection && activeState?.agentState !== 'approved') {
        const fallbackKey = handlerKeys.includes(agentSelection.previousKey)
          ? agentSelection.previousKey
          : handlerKeys[0];
        log.warn(
          `${fileName}: handler "${activeHandlerKey}" (escolhido por agente) não está mais aprovado, voltando para "${fallbackKey}"`,
        );
        activeHandlerKey = fallbackKey;
        this.agentSelections.clear(fileName);
      }

      // auto-cura: chave salva não existe mais (endpoint foi editado) — regrava a escolhida
      if (activeHandlerKey !== storedHandlerKey) {
        this.activeHandlerSelections[fileName] = activeHandlerKey;
      }

      if (enabled) {
        this.enabledEndpointModules.push({
          endpoint,
          activeHandler: handlersMap[activeHandlerKey].handler,
        });
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
        handlerOptions,
        activeHandlerKey,
        activeHandlerByAgent: this.agentSelections.has(fileName),
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
        const serverAddress = endpoint.serverAddress;

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
    activeHandlerSelectionsData?: Record<string, string>,
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

      log.info('Salvando arquivo de handlers ativos');

      const activeHandlers = activeHandlerSelectionsData || this.activeHandlerSelections;
      fs.writeFileSync(this.activeHandlersFilePath, JSON.stringify(activeHandlers, null, 2));

      this.agentSelections.save();
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

  changeActiveHandlers(changes: { fileName: string; handlerKey: string }[]) {
    const log = this.logger.startSection('changeActiveHandlers');

    for (const { fileName, handlerKey } of changes) {
      log.step(`${fileName} -> ${handlerKey}`);

      const loadedModule = this.loadedModules.find((module) => module.fileName === fileName);

      if (!loadedModule || loadedModule.loadError || !loadedModule.endpoint) {
        log.endSection();
        throw new Error(`Endpoint não encontrado ou com erro de carregamento: ${fileName}`);
      }

      const handlersMap = getEndpointHandlersMap(loadedModule.endpoint);

      if (!(handlerKey in handlersMap)) {
        log.endSection();
        throw new Error(`Handler "${handlerKey}" não existe no endpoint: ${fileName}`);
      }

      this.activeHandlerSelections[fileName] = handlerKey;
      // escolha humana: o handler ativo deixa de ser "do agente"
      this.agentSelections.clear(fileName);
    }

    this.buildEnabledEndpointList();
    this.saveConfigFile();

    // Diferente de toggleEndpoints, essa troca não mexe no arquivo de proxy do host —
    // não há watcher de arquivo para disparar a notificação SSE sozinho.
    this.notifyReload();

    log.endSection();
  }

  private getAgentHandlerState(
    fileName: string,
    handlerKey: string,
    entry: EndpointHandlerEntry,
  ): AgentHandlerState {
    if (entry.agentControl !== 'allowed') {
      return 'blocked';
    }

    const { hash } = readHandlerSource(entry.handler);
    return this.agentApprovals.isApproved(fileName, handlerKey, hash) ? 'approved' : 'pending';
  }

  private findLoadedEndpoint(target: string) {
    const loaded = this.loadedModules.filter(
      (module) => module.fileName === target || module.endpoint?.serverAddress === target,
    );
    const exact = loaded.filter((module) => module.fileName === target);
    const matches = exact.length > 0 ? exact : loaded;

    if (matches.length === 0) {
      throw new AgentControlError(`Endpoint não encontrado: ${target}`, 404);
    }
    if (matches.length > 1) {
      throw new AgentControlError(
        `"${target}" é ambíguo (${matches.map((m) => m.fileName).join(', ')}). Use o fileName.`,
        409,
      );
    }

    const [{ endpoint, fileName, loadError }] = matches;
    if (loadError || !endpoint) {
      throw new AgentControlError(`Endpoint com erro de carregamento: ${fileName}`, 409);
    }

    return { endpoint, fileName };
  }

  async listForAgent() {
    await this.loadingGate.wait();

    return this.endpoints.listEndpoints.map((endpoint) => ({
      endpoint: endpoint.fileName,
      serverAddress: endpoint.serverAddress,
      method: endpoint.method,
      enabled: endpoint.enabled,
      loadError: endpoint.loadError,
      activeHandler: endpoint.activeHandlerKey,
      activeHandlerByAgent: endpoint.activeHandlerByAgent,
      handlers: endpoint.handlerOptions.map((option) => ({
        name: option.key,
        state: option.agentState,
        // handler bloqueado: o agente sabe que existe, mas não vê detalhes
        ...(option.agentState === 'blocked' ? {} : { description: option.description }),
      })),
    }));
  }

  async agentSetHandler(target: string, handlerKey: string) {
    const log = this.logger.startSection('agentSetHandler');

    try {
      // o agente costuma editar o arquivo e chamar logo em seguida: espera reload em andamento
      await this.loadingGate.wait();

      const { endpoint, fileName } = this.findLoadedEndpoint(target);
      const handlersMap = getEndpointHandlersMap(endpoint);
      const entry = handlersMap[handlerKey];

      if (!entry) {
        throw new AgentControlError(
          `Handler "${handlerKey}" não existe em ${fileName} (existentes: ${Object.keys(handlersMap).join(', ')}). Se acabou de editar o arquivo, aguarde o reload e tente de novo.`,
          404,
        );
      }

      if (!this.enabledAddresses.some((record) => record.fileName === fileName)) {
        throw new AgentControlError(
          `Endpoint ${fileName} está desligado. Ligar endpoint é decisão humana: peça para ligar no painel.`,
          409,
        );
      }

      const state = this.getAgentHandlerState(fileName, handlerKey, entry);
      if (state === 'blocked') {
        throw new AgentControlError(
          `Handler "${handlerKey}" de ${fileName} não permite ativação por agente (agentControl). Peça a um humano para ativá-lo no painel.`,
          403,
        );
      }
      if (state === 'pending') {
        throw new AgentControlError(
          `Handler "${handlerKey}" de ${fileName} está pendente de aprovação humana (novo ou alterado). Peça para aprovar no painel.`,
          403,
        );
      }

      const previousKey = this.activeHandlerSelections[fileName];
      if (previousKey === handlerKey) {
        return;
      }

      this.agentSelections.set(fileName, previousKey);
      this.activeHandlerSelections[fileName] = handlerKey;
      log.warn(`[AGENTE] ${fileName}: handler "${previousKey}" -> "${handlerKey}"`);

      this.buildEnabledEndpointList();
      this.saveConfigFile();
      this.notifyReload();
    } finally {
      log.endSection();
    }
  }

  getPendingApprovals() {
    const pending: {
      fileName: string;
      handlerKey: string;
      description: string;
      hash: string;
      source: string;
      approvedSource: string | null;
    }[] = [];

    for (const { endpoint, fileName } of this.loadedModules) {
      if (!endpoint) continue;

      for (const [handlerKey, entry] of Object.entries(getEndpointHandlersMap(endpoint))) {
        if (this.getAgentHandlerState(fileName, handlerKey, entry) !== 'pending') continue;

        const { hash, source } = readHandlerSource(entry.handler);
        pending.push({
          fileName,
          handlerKey,
          description: entry.description,
          hash,
          source,
          approvedSource: this.agentApprovals.get(fileName, handlerKey)?.source ?? null,
        });
      }
    }

    return pending;
  }

  /**
   * Aprovação humana. O `hash` enviado é o do código que a pessoa viu no painel: se o
   * arquivo mudou entre a revisão e o clique, a aprovação é recusada (409).
   */
  approveHandlers(items: { fileName: string; handlerKey: string; hash: string }[]) {
    const log = this.logger.startSection('approveHandlers');

    try {
      const validated = items.map(({ fileName, handlerKey, hash }) => {
        const { endpoint } = this.findLoadedEndpoint(fileName);
        const entry = getEndpointHandlersMap(endpoint)[handlerKey];

        if (!entry) {
          throw new AgentControlError(`Handler "${handlerKey}" não existe em ${fileName}`, 404);
        }
        if (entry.agentControl !== 'allowed') {
          throw new AgentControlError(
            `Handler "${handlerKey}" de ${fileName} não declara agentControl: 'allowed'`,
            400,
          );
        }

        const current = readHandlerSource(entry.handler);
        if (current.hash !== hash) {
          throw new AgentControlError(
            `O código de "${handlerKey}" em ${fileName} mudou depois da revisão. Revise de novo.`,
            409,
          );
        }

        return { fileName, handlerKey, current };
      });

      for (const { fileName, handlerKey, current } of validated) {
        this.agentApprovals.approve(fileName, handlerKey, current);
        log.success(`Aprovado: ${fileName} / ${handlerKey}`);
      }

      this.buildEnabledEndpointList();
      this.saveConfigFile();
      this.notifyReload();
    } finally {
      log.endSection();
    }
  }

  revokeHandlers(items: { fileName: string; handlerKey: string }[]) {
    const log = this.logger.startSection('revokeHandlers');

    try {
      for (const { fileName, handlerKey } of items) {
        this.agentApprovals.revoke(fileName, handlerKey);
        log.warn(`Aprovação revogada: ${fileName} / ${handlerKey}`);
      }

      // se o handler revogado estava ativo por escolha do agente, o build volta o anterior
      this.buildEnabledEndpointList();
      this.saveConfigFile();
      this.notifyReload();
    } finally {
      log.endSection();
    }
  }

  /** Desfaz a escolha do agente: volta ao handler que estava ativo antes dela. */
  revertAgentHandler(fileName: string) {
    const log = this.logger.startSection('revertAgentHandler');

    try {
      const selection = this.agentSelections.selections[fileName];
      if (!selection) {
        throw new AgentControlError(`O handler de ${fileName} não foi escolhido por agente`, 409);
      }

      const { endpoint } = this.findLoadedEndpoint(fileName);
      const handlerKeys = Object.keys(getEndpointHandlersMap(endpoint));

      this.activeHandlerSelections[fileName] = handlerKeys.includes(selection.previousKey)
        ? selection.previousKey
        : handlerKeys[0];
      this.agentSelections.clear(fileName);
      log.warn(`${fileName}: escolha do agente revertida`);

      this.buildEnabledEndpointList();
      this.saveConfigFile();
      this.notifyReload();
    } finally {
      log.endSection();
    }
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
      // recursive: true também retorna entradas de subpastas (ex: "sub/foo.ts"), já
      // como caminho relativo a resolvedDir — é esse valor que vira fileName.
      files = fs.readdirSync(resolvedDir, { recursive: true }) as string[];
      files = files.filter((file) => {
        // Verifica se é um arquivo e tem extensão .ts ou .js (subpastas não batem)
        return /\.(ts|js)$/.test(file);
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
