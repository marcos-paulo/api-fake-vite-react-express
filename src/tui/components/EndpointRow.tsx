import { Box, Text } from 'ink';

import type { Endpoint } from '../../types/endpoints.types';

type EndpointRowProps = {
  endpoint: Endpoint;
  displayEnabled: boolean;
  isFocused: boolean;
  isPending: boolean;
  pendingHandlerKey?: string;
};

export const EndpointRow = ({
  endpoint,
  displayEnabled,
  isFocused,
  isPending,
  pendingHandlerKey,
}: EndpointRowProps) => {
  const isError = endpoint.loadError;
  const activeHandlerKey = pendingHandlerKey ?? endpoint.activeHandlerKey;
  const activeHandlerOption = endpoint.handlerOptions.find(
    (option) => option.key === activeHandlerKey,
  );

  const marker = displayEnabled ? '[x]' : '[ ]';
  const pointer = isFocused ? '›' : ' ';
  const nameColor = isError ? 'red' : isPending ? 'yellow' : isFocused ? 'cyanBright' : undefined;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={nameColor} bold={isFocused}>
          {pointer} {marker} {endpoint.fileName}
        </Text>
        {isError && <Text color="red"> erro</Text>}
        {endpoint.isDuplicate && <Text color="#ff6b35"> duplicado</Text>}
        {isPending && <Text color="yellow"> pendente</Text>}
      </Box>
      <Box marginLeft={4}>
        <Text color={isError ? 'red' : undefined}>
          {isError ? 'Erro ao carregar módulo' : endpoint.description}
        </Text>
      </Box>
      <Box marginLeft={4}>
        <Text dimColor>
          {endpoint.serverAddress} — {endpoint.localhostAddress}
        </Text>
      </Box>
      {endpoint.tags.length > 0 && (
        <Box marginLeft={4}>
          <Text color="gray">{endpoint.tags.map((tag) => `#${tag}`).join(' ')}</Text>
        </Box>
      )}
      {endpoint.handlerOptions.length > 1 && (
        <Box marginLeft={4}>
          <Text color="gray">Resposta ({'<-'}/{'->'}): </Text>
          <Text color={isFocused ? 'cyanBright' : undefined}>
            {activeHandlerOption?.description ?? activeHandlerKey}
          </Text>
        </Box>
      )}
    </Box>
  );
};
