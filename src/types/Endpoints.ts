import type { FailedModuleRecord } from './dynamic-endpoints.types';

export type Endpoints = {
  listEndpoints: Endpoint[];
  failedFiles: FailedModuleRecord[];
};

export type Endpoint = {
  description: string;
  serverAddress: string;
  localhostAddress: string;
  method: string;
  enabled: boolean;
  fileName: string;
  loadError: boolean;
};
