import axios, { type InternalAxiosRequestConfig } from 'axios';

import { getConfig } from '../../../shared/config';
import { readOrCreatePanelToken } from '../../../shared/panel-token';

export const apiBaseUrl = `http://127.0.0.1:${getConfig().API_PORT}`;

// A TUI é interface de humano e roda na máquina dele: lê o token do painel direto do arquivo.
export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'x-api-fake-token': readOrCreatePanelToken() },
});

type ConfigWithMetadata = InternalAxiosRequestConfig & { metadata?: { startedAt: number } };

// Único lugar por onde toda chamada da TUI ao backend passa — loga aqui em vez
// de espalhar console.log pelos hooks, cobrindo qualquer request futura de
// graça. Cai no arquivo de log via o redirect de console em file-logger.ts.
apiClient.interceptors.request.use((config: ConfigWithMetadata) => {
  config.metadata = { startedAt: Date.now() };
  console.log(`[fetch] --> ${(config.method ?? 'get').toUpperCase()} ${config.url}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as ConfigWithMetadata;
    const durationMs = config.metadata ? Date.now() - config.metadata.startedAt : undefined;
    console.log(
      `[fetch] <-- ${(config.method ?? 'get').toUpperCase()} ${config.url} -> ${response.status}` +
        (durationMs !== undefined ? ` (${durationMs}ms)` : ''),
    );
    return response;
  },
  (error) => {
    const config = error.config as ConfigWithMetadata | undefined;
    const durationMs = config?.metadata ? Date.now() - config.metadata.startedAt : undefined;
    const status = error.response?.status ?? 'sem resposta';
    console.error(
      `[fetch] <-- ${(config?.method ?? 'get').toUpperCase()} ${config?.url} -> ${status}` +
        (durationMs !== undefined ? ` (${durationMs}ms)` : '') +
        ` — ${error.message}`,
    );
    return Promise.reject(error);
  },
);
