import { type Request, type Response } from 'express';

export type EndpointMethod = 'get' | 'post' | 'put' | 'delete';

export type EndpointObject = {
  description: string;
  endpointServerPrefix?: string;
  localhostEndpoint: string;
  method: EndpointMethod;
  handler: (req: Request, res: Response) => void;
};

export type LoadedModule = {
  endpoint: EndpointObject | null;
  fileName: string;
  loadError: boolean;
};

export function isEndpointObject(endpoint: unknown): endpoint is EndpointObject {
  if (!endpoint || typeof endpoint !== 'object') {
    return false;
  }

  return isEndpoint(endpoint as Partial<EndpointObject>);
}

function isEndpoint(endpoint: Partial<EndpointObject>): endpoint is EndpointObject {
  return (
    // typeof endpoint.endpointServerPrefix === "string" &&
    typeof endpoint.localhostEndpoint === 'string' &&
    typeof endpoint.handler === 'function' &&
    !!endpoint.method &&
    ['get', 'post', 'put', 'delete'].includes(endpoint.method)
  );
}

export type ModuleEndpoint = { endpoint: EndpointObject };

export type EnabledEndpointRecord = {
  fileName: string;
};
