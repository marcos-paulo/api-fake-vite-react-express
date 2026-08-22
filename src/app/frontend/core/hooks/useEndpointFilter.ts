import { useCallback, useMemo, useState } from 'react';

import type { Endpoints } from '../../../../types/endpoints.types';

export type UseEndpointFilterOptions = {
  // Permite que um shell saneie o valor bruto antes de virar estado — ex.: a TUI
  // precisa descartar caracteres de controle que o input do terminal pode colar
  // junto com o texto digitado.
  sanitizeFilterText?: (value: string) => string;
};

export function useEndpointFilter(
  endpoints: Endpoints | null,
  { sanitizeFilterText }: UseEndpointFilterOptions = {},
) {
  const [filterText, setFilterTextRaw] = useState('');

  const setFilterText = useCallback(
    (value: string) => {
      setFilterTextRaw(sanitizeFilterText ? sanitizeFilterText(value) : value);
    },
    [sanitizeFilterText],
  );

  // Compilado apenas quando filterText muda, não a cada endpoint iterado
  const filterRegexes = useMemo(() => {
    return filterText
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => {
        // Escapa tudo exceto ".", que é curinga (qualquer caractere)
        const pattern = token.replace(/[^.]/g, (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return new RegExp(pattern, 'i');
      });
  }, [filterText]);

  const filteredEndpoints = useMemo(() => {
    if (!endpoints) return null;
    return {
      listEndpoints:
        filterRegexes.length === 0
          ? endpoints.listEndpoints
          : endpoints.listEndpoints.filter((ep) => {
              const tagsText = ep.tags.join(' ');
              return filterRegexes.some(
                (regex) =>
                  regex.test(ep.description) ||
                  regex.test(ep.localhostAddress) ||
                  regex.test(ep.method) ||
                  regex.test(tagsText),
              );
            }),
    };
  }, [endpoints, filterRegexes]);

  return { filterText, setFilterText, filteredEndpoints };
}
