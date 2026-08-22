import { useMemo, useState } from 'react';

import type { Endpoints } from '../../types/endpoints.types';

// Porta 1:1 de src/client/hooks/useEndpointFilter.ts — mesmo comportamento de
// filtro precisa valer tanto no browser quanto na TUI.
export function useEndpointFilter(endpoints: Endpoints | null) {
  const [filterText, setFilterText] = useState('');

  const filterRegexes = useMemo(() => {
    return filterText
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => {
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
