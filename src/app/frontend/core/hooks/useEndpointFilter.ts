import { useCallback, useMemo, useState } from 'react';

import type { Endpoints } from '../../../../types/endpoints.types';

export type UseEndpointFilterOptions = {
  // Permite que um shell saneie o valor bruto antes de virar estado — ex.: a TUI
  // precisa descartar caracteres de controle que o input do terminal pode colar
  // junto com o texto digitado.
  sanitizeFilterText?: (value: string) => string;
  // Texto inicial (ex.: a web restaura o último filtro) e aviso a cada mudança (pra guardar).
  initialFilterText?: string;
  onFilterTextChange?: (value: string) => void;
};

export function useEndpointFilter(
  endpoints: Endpoints | null,
  { sanitizeFilterText, initialFilterText = '', onFilterTextChange }: UseEndpointFilterOptions = {},
) {
  const [filterText, setFilterTextRaw] = useState(initialFilterText);

  const setFilterText = useCallback(
    (value: string) => {
      const next = sanitizeFilterText ? sanitizeFilterText(value) : value;
      setFilterTextRaw(next);
      onFilterTextChange?.(next);
    },
    [sanitizeFilterText, onFilterTextChange],
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
                  regex.test(ep.title) ||
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
