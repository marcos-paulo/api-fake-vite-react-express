import { Box, Text, useInput } from 'ink';

import type { Endpoint, Endpoints } from '../../types/endpoints.types';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { EndpointRow } from './EndpointRow';

type EndpointListProps = {
  endpoints: Endpoints | null;
  isActive: boolean;
  isLoading: boolean;
  pendingChanges: Set<string>;
  pendingHandlerChanges: Record<string, string>;
  focusedFileName: string | null;
  onFocusChange: (fileName: string) => void;
  onToggleEndpoint: (endpoint: Endpoint) => void;
  onCycleHandler: (fileName: string, direction: 1 | -1) => void;
  onOpenEndpointFile: (fileName: string) => void;
};

// Mesmo particionamento de src/client/components/ListEndpoints/ListEndpoints.tsx —
// entradas com loadError vêm primeiro, cada arquivo aparece em uma única seção.
function partitionEndpoints(endpoints: Endpoint[], pendingChanges: Set<string>) {
  const enabled = [
    ...endpoints.filter((ep) => ep.loadError && ep.enabled),
    ...endpoints.filter((ep) => {
      if (ep.loadError) return false;
      const isPending = pendingChanges.has(ep.fileName);
      return isPending ? !ep.enabled : ep.enabled;
    }),
  ];

  const disabled = [
    ...endpoints.filter((ep) => ep.loadError && !ep.enabled),
    ...endpoints.filter((ep) => {
      if (ep.loadError) return false;
      const isPending = pendingChanges.has(ep.fileName);
      return isPending ? ep.enabled : !ep.enabled;
    }),
  ];

  return { enabled, disabled };
}

// Altura em linhas que cada EndpointRow ocupa de fato (ver EndpointRow.tsx):
// nome, descrição, endereço e a margem inferior são fixos; tags e variante de
// resposta só aparecem quando existem.
function estimateRowHeight(endpoint: Endpoint): number {
  let lines = 4;
  if (endpoint.tags.length > 0) lines += 1;
  if (endpoint.handlerOptions.length > 1) lines += 1;
  return lines;
}

// Linhas ocupadas fora da lista (título, barra de filtro, status bar) mais os
// dois cabeçalhos de seção — usado pra saber quantas linhas sobram pros itens.
// Inclui uma margem de segurança pra variações de quebra de linha em
// terminais estreitos.
const CHROME_OUTSIDE_LIST = 16;
const MIN_LIST_BUDGET = 4;

function computeVisibleWindow(heights: number[], focusedIndex: number, budget: number) {
  if (heights.length === 0) return { start: 0, end: 0 };

  const focus = Math.min(Math.max(focusedIndex, 0), heights.length - 1);
  let start = focus;
  let end = focus;
  let used = heights[focus] ?? 0;

  let canGrowUp = start > 0;
  let canGrowDown = end < heights.length - 1;
  let preferUp = true;

  // Cresce a janela item por item, alternando lado, sem nunca comitar um
  // item que estoure o orçamento — só desativa aquele lado e tenta o outro.
  while (canGrowUp || canGrowDown) {
    const growUpNow = preferUp ? canGrowUp : !canGrowDown;

    if (growUpNow) {
      const height = heights[start - 1];
      if (used + height > budget) {
        canGrowUp = false;
      } else {
        start -= 1;
        used += height;
        canGrowUp = start > 0;
      }
    } else if (canGrowDown) {
      const height = heights[end + 1];
      if (used + height > budget) {
        canGrowDown = false;
      } else {
        end += 1;
        used += height;
        canGrowDown = end < heights.length - 1;
      }
    }

    preferUp = !preferUp;
  }

  return { start, end: end + 1 };
}

function hiddenCounts(
  sectionStart: number,
  sectionLength: number,
  windowStart: number,
  windowEnd: number,
) {
  const sectionEnd = sectionStart + sectionLength;
  const hiddenAbove = Math.max(0, Math.min(windowStart, sectionEnd) - sectionStart);
  const hiddenBelow = Math.max(0, sectionEnd - Math.max(windowEnd, sectionStart));
  return { hiddenAbove, hiddenBelow };
}

export const EndpointList = ({
  endpoints,
  isActive,
  isLoading,
  pendingChanges,
  pendingHandlerChanges,
  focusedFileName,
  onFocusChange,
  onToggleEndpoint,
  onCycleHandler,
  onOpenEndpointFile,
}: EndpointListProps) => {
  const { rows } = useTerminalSize();
  const allEndpoints = endpoints?.listEndpoints ?? [];
  const { enabled, disabled } = partitionEndpoints(allEndpoints, pendingChanges);
  const flatList = [...enabled, ...disabled];

  const focusedIndex = Math.max(
    0,
    flatList.findIndex((ep) => ep.fileName === focusedFileName),
  );
  const focusedEndpoint = flatList[focusedIndex];

  useInput(
    (input, key) => {
      if (isLoading || flatList.length === 0) return;

      if (key.downArrow || input === 'j') {
        const next = flatList[Math.min(focusedIndex + 1, flatList.length - 1)];
        if (next) onFocusChange(next.fileName);
      } else if (key.upArrow || input === 'k') {
        const prev = flatList[Math.max(focusedIndex - 1, 0)];
        if (prev) onFocusChange(prev.fileName);
      } else if ((input === ' ' || key.return) && focusedEndpoint && !focusedEndpoint.loadError) {
        onToggleEndpoint(focusedEndpoint);
      } else if (key.rightArrow && focusedEndpoint && focusedEndpoint.handlerOptions.length > 1) {
        onCycleHandler(focusedEndpoint.fileName, 1);
      } else if (key.leftArrow && focusedEndpoint && focusedEndpoint.handlerOptions.length > 1) {
        onCycleHandler(focusedEndpoint.fileName, -1);
      } else if (input === 'o' && focusedEndpoint) {
        onOpenEndpointFile(focusedEndpoint.fileName);
      }
    },
    { isActive },
  );

  const budget = Math.max(rows - CHROME_OUTSIDE_LIST, MIN_LIST_BUDGET);
  const heights = flatList.map(estimateRowHeight);
  const { start, end } = computeVisibleWindow(heights, focusedIndex, budget);

  const enabledWindow = hiddenCounts(0, enabled.length, start, end);
  const disabledWindow = hiddenCounts(enabled.length, disabled.length, start, end);

  const visibleEnabled = enabled.slice(
    enabledWindow.hiddenAbove,
    enabled.length - enabledWindow.hiddenBelow,
  );
  const visibleDisabled = disabled.slice(
    disabledWindow.hiddenAbove,
    disabled.length - disabledWindow.hiddenBelow,
  );

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="green">
          Habilitados ({enabled.length})
        </Text>
        {enabled.length === 0 && <Text dimColor>  Nenhum endpoint habilitado</Text>}
        {enabledWindow.hiddenAbove > 0 && (
          <Text dimColor>  ↑ +{enabledWindow.hiddenAbove} acima</Text>
        )}
        {visibleEnabled.map((endpoint) => (
          <EndpointRow
            key={endpoint.serverAddress + endpoint.fileName}
            endpoint={endpoint}
            displayEnabled
            isFocused={endpoint.fileName === focusedEndpoint?.fileName}
            isPending={
              pendingChanges.has(endpoint.fileName) || endpoint.fileName in pendingHandlerChanges
            }
            pendingHandlerKey={pendingHandlerChanges[endpoint.fileName]}
          />
        ))}
        {enabledWindow.hiddenBelow > 0 && (
          <Text dimColor>  ↓ +{enabledWindow.hiddenBelow} abaixo</Text>
        )}
      </Box>

      <Box flexDirection="column">
        <Text bold color="gray">
          Desabilitados ({disabled.length})
        </Text>
        {disabled.length === 0 && <Text dimColor>  Nenhum endpoint desabilitado</Text>}
        {disabledWindow.hiddenAbove > 0 && (
          <Text dimColor>  ↑ +{disabledWindow.hiddenAbove} acima</Text>
        )}
        {visibleDisabled.map((endpoint) => (
          <EndpointRow
            key={endpoint.fileName}
            endpoint={endpoint}
            displayEnabled={false}
            isFocused={endpoint.fileName === focusedEndpoint?.fileName}
            isPending={
              pendingChanges.has(endpoint.fileName) || endpoint.fileName in pendingHandlerChanges
            }
            pendingHandlerKey={pendingHandlerChanges[endpoint.fileName]}
          />
        ))}
        {disabledWindow.hiddenBelow > 0 && (
          <Text dimColor>  ↓ +{disabledWindow.hiddenBelow} abaixo</Text>
        )}
      </Box>
    </Box>
  );
};
