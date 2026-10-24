import type { Endpoint } from '../../../../../types/endpoints.types';

export type StatusFilter = 'all' | 'enabled' | 'disabled' | 'problem';

// Usa o estado salvo (endpoint.enabled), não o pendente: a linha não pula de grupo ao alternar
// o switch, só ao salvar.
const statusMatchers: Record<StatusFilter, (endpoint: Endpoint) => boolean> = {
  all: () => true,
  enabled: (endpoint) => endpoint.enabled,
  disabled: (endpoint) => !endpoint.enabled,
  problem: (endpoint) => endpoint.loadError || endpoint.isDuplicate,
};

export function matchesStatus(endpoint: Endpoint, status: StatusFilter): boolean {
  return statusMatchers[status](endpoint);
}

export function countByStatus(endpoints: Endpoint[]): Record<StatusFilter, number> {
  return {
    all: endpoints.length,
    enabled: endpoints.filter(statusMatchers.enabled).length,
    disabled: endpoints.filter(statusMatchers.disabled).length,
    problem: endpoints.filter(statusMatchers.problem).length,
  };
}

/** Abas de estado, na ordem em que aparecem. */
export const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'enabled', label: 'Habilitados' },
  { value: 'disabled', label: 'Desabilitados' },
  { value: 'problem', label: 'Com problema' },
];
