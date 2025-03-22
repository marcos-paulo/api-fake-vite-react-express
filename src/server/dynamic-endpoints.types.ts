import { Request, Response } from "express";

export type EndpointObject = {
  description: string;
  endpointServerPrefix?: string;
  localhostEndpoint: string;
  method: "get" | "post" | "put" | "delete";
  handler: (req: Request, res: Response) => void;
};

export function isModuleEndpoints(module: unknown): module is EndpointObject[] {
  return Array.isArray(module) && module.every((e) => isEndpoint(e));
}

function isEndpoint(
  endpoint: Partial<EndpointObject>
): endpoint is EndpointObject {
  return (
    // typeof endpoint.endpointServerPrefix === "string" &&
    typeof endpoint.localhostEndpoint === "string" &&
    typeof endpoint.handler === "function" &&
    !!endpoint.method &&
    ["get", "post", "put", "delete"].includes(endpoint.method)
  );
}

export type ModuleEndpoint = { default: EndpointObject[] };
