import type { Endpoints } from '../../../../types/endpoints.types';
import { useEndpointFilter as useCoreEndpointFilter } from '../../core/hooks/useEndpointFilter';

// Quando teclas chegam "coladas" num único evento do terminal (ex: digitar
// rápido e apertar Enter sem pausa), o ink-text-input pode inserir o
// caractere de controle (\r do Enter, \x1B do Escape) direto no texto —
// sem isso, o filtro ficava com um \r sobrando no valor, corrompendo a
// renderização da linha (\r volta o cursor pro início da linha).
function sanitizeFilterText(value: string) {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1F\x7F]/g, '');
}

export function useEndpointFilter(endpoints: Endpoints | null) {
  return useCoreEndpointFilter(endpoints, { sanitizeFilterText });
}
