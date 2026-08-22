import { Box, Text, useInput } from 'ink';

import type { Endpoint, Endpoints } from '../../types/endpoints.types';
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

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="green">
          Habilitados ({enabled.length})
        </Text>
        {enabled.length === 0 && <Text dimColor>  Nenhum endpoint habilitado</Text>}
        {enabled.map((endpoint) => (
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
      </Box>

      <Box flexDirection="column">
        <Text bold color="gray">
          Desabilitados ({disabled.length})
        </Text>
        {disabled.length === 0 && <Text dimColor>  Nenhum endpoint desabilitado</Text>}
        {disabled.map((endpoint) => (
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
      </Box>
    </Box>
  );
};
