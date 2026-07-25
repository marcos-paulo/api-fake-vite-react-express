import type { EndpointMethod } from './dynamic-endpoints.types';

export type Endpoints = {
  listEndpoints: Endpoint[];
};

export type HandlerOption = {
  key: string;
  description: string;
};

export type Endpoint = {
  description: string;
  serverAddress: string;
  localhostAddress: string;
  method: EndpointMethod;
  tags: string[];
  enabled: boolean;
  fileName: string;
  loadError: boolean;
  isDuplicate: boolean;
  duplicateFiles: string[];
  handlerOptions: HandlerOption[];
  activeHandlerKey: string;
};
