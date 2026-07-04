import type { EndpointMethod } from './dynamic-endpoints.types';

export type Endpoints = {
  listEndpoints: Endpoint[];
};

export type Endpoint = {
  description: string;
  serverAddress: string;
  localhostAddress: string;
  method: EndpointMethod;
  enabled: boolean;
  fileName: string;
  loadError: boolean;
  isDuplicate: boolean;
  duplicateFiles: string[];
};
