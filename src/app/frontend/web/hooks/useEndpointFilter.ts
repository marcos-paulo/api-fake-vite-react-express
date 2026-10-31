import type { Endpoints } from '../../../../types/endpoints.types';
import { useEndpointFilter as useCoreEndpointFilter } from '../../core/hooks/useEndpointFilter';
import { useStoredState } from './useStoredState';

const isString = (value: unknown): value is string => typeof value === 'string';

// O texto do filtro fica guardado por visitante, pra voltar igual depois de reiniciar.
export function useEndpointFilter(endpoints: Endpoints | null) {
  const [storedText, setStoredText] = useStoredState('api-fake:filter-text', '', isString);
  const { filterText, setFilterText, filteredEndpoints } = useCoreEndpointFilter(endpoints, {
    initialFilterText: storedText,
    onFilterTextChange: setStoredText,
  });
  return { filterText, setFilterText, filteredEndpoints };
}
