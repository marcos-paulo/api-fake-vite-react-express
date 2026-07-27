import type { Request, Response } from 'express';

export type EndpointMethod = 'get' | 'post' | 'put' | 'delete';

export type EndpointHandlerFn = (req: Request, res: Response) => void;

export type EndpointHandlerEntry = {
  description: string;
  handler: EndpointHandlerFn;
};

export type EndpointHandlersMap = Record<string, EndpointHandlerEntry>;

type EndpointBase = {
  description: string;
  endpointServerPrefix?: string;
  localhostEndpoint: string;
  method: EndpointMethod;
  tags?: string[];
};

export type EndpointObject = EndpointBase &
  (
    | { handler: EndpointHandlerFn; handlers?: never } // legado: handler único
    | { handlers: EndpointHandlersMap; handler?: never } // handlers múltiplos nomeados
  );

export type LoadedModule = {
  endpoint: EndpointObject | null;
  fileName: string;
  loadError: boolean;
};

export function isEndpointObject(endpoint: unknown): endpoint is EndpointObject {
  if (!endpoint || typeof endpoint !== 'object') {
    return false;
  }

  return isEndpoint(endpoint as Partial<EndpointBase> & { handler?: unknown; handlers?: unknown });
}

function isEndpoint(
  endpoint: Partial<EndpointBase> & { handler?: unknown; handlers?: unknown },
): endpoint is EndpointObject {
  const hasValidTags =
    endpoint.tags === undefined ||
    (Array.isArray(endpoint.tags) && endpoint.tags.every((tag) => typeof tag === 'string'));

  return (
    // typeof endpoint.endpointServerPrefix === "string" &&
    typeof endpoint.localhostEndpoint === 'string' &&
    !!endpoint.method &&
    ['get', 'post', 'put', 'delete'].includes(endpoint.method) &&
    hasValidTags &&
    isValidHandlersShape(endpoint.handler, endpoint.handlers)
  );
}

function isValidHandlersShape(handler: unknown, handlers: unknown): boolean {
  const hasLegacyHandler = typeof handler === 'function';
  const hasHandlersMap = isValidHandlersMap(handlers);

  // exatamente um dos dois formatos deve estar presente
  return hasLegacyHandler !== hasHandlersMap;
}

function isValidHandlersMap(handlers: unknown): handlers is EndpointHandlersMap {
  if (!handlers || typeof handlers !== 'object') {
    return false;
  }

  const entries = Object.values(handlers as Record<string, unknown>);

  return (
    entries.length > 0 &&
    entries.every((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const { description, handler } = entry as Partial<EndpointHandlerEntry>;
      return typeof description === 'string' && typeof handler === 'function';
    })
  );
}

/**
 * Normaliza os dois formatos aceitos de handler num único mapa — endpoints com
 * `handler` legado viram um mapa de uma entrada só, sob a chave "default".
 */
export function getEndpointHandlersMap(endpoint: EndpointObject): EndpointHandlersMap {
  // O "in" nativo não estreita bem essa união intersectada com EndpointBase — cast explícito.
  const raw = endpoint as EndpointBase & {
    handler?: EndpointHandlerFn;
    handlers?: EndpointHandlersMap;
  };

  if (raw.handlers) {
    return raw.handlers;
  }

  return {
    default: { description: raw.description, handler: raw.handler as EndpointHandlerFn },
  };
}

export type ModuleEndpoint = { endpoint: EndpointObject };

export type EnabledEndpointRecord = {
  fileName: string;
};
