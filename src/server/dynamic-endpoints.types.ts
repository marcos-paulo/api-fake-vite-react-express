import { Request, Response } from "express";

export type EndpointModule = {
  endpointServerPrefix?: string;
  localhostEndpoint: string;
  method: "get" | "post" | "put" | "delete";
  handler: (req: Request, res: Response) => void;
};

export type ListEndpointModule = EndpointModule[];

export function isModuleEndpoints(module: any): module is EndpointModule[] {
  return Array.isArray(module) && module.every((e) => isEndpoint(e));
}

function isEndpoint(
  endpoint: Partial<EndpointModule>
): endpoint is EndpointModule {
  return (
    // typeof endpoint.endpointServerPrefix === "string" &&
    typeof endpoint.localhostEndpoint === "string" &&
    typeof endpoint.handler === "function" &&
    !!endpoint.method &&
    ["get", "post", "put", "delete"].includes(endpoint.method)
  );
}

export type PromiseModule = Promise<{ default: ListEndpointModule }>;
