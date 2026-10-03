import type { AgentControl, EndpointMethod } from './dynamic-endpoints.types';

export type Endpoints = {
  listEndpoints: Endpoint[];
};

/**
 * Estado efetivo de um handler para o agente de IA, calculado pelo servidor:
 * - approved: flag `agentControl: 'allowed'` + aprovação humana com hash igual ao código atual.
 * - pending: flag `allowed`, mas sem aprovação (handler novo ou código alterado depois).
 * - blocked: sem flag `allowed` — o agente nunca ativa.
 */
export type AgentHandlerState = 'approved' | 'pending' | 'blocked';

export type HandlerOption = {
  key: string;
  description: string;
  agentControl: AgentControl;
  agentState: AgentHandlerState;
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
  /** O handler ativo foi escolhido por um agente (não por um humano no painel). */
  activeHandlerByAgent: boolean;
};
