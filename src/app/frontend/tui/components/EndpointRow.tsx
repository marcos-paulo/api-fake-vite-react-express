import { Box, Text } from 'ink';

import type { Endpoint } from '../../../../types/endpoints.types';

type EndpointRowProps = {
  endpoint: Endpoint;
  displayEnabled: boolean;
  isFocused: boolean;
  isPending: boolean;
  pendingHandlerKey?: string;
};

// Textos exatos usados nas linhas da row — exportados pra EndpointList.tsx
// medir (via wrap-ansi) quantas linhas cada campo realmente vai ocupar antes
// de renderizar, sem duplicar essas strings em dois lugares que poderiam
// divergir.
export const ERROR_BADGE = ' erro';
export const DUPLICATE_BADGE = ' duplicado';
export const PENDING_BADGE = ' pendente';
export const ADDRESS_SEPARATOR = ' — ';
export const HANDLER_LABEL = 'Resposta (<-/->): ';
export const ERROR_DESCRIPTION_FALLBACK = 'Erro ao carregar módulo';

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
        {/* Badges aninhados no mesmo Text (em vez de Texts irmãos no Box) pra
            contarem como um único nó de quebra de linha pro Ink — bate com o
            cálculo de altura em EndpointList.tsx, que trata a linha inteira
            como uma unidade só. */}
        <Text color={nameColor} bold={isFocused}>
          {pointer} {marker} {endpoint.fileName}
          {isError && <Text color="red">{ERROR_BADGE}</Text>}
          {endpoint.isDuplicate && <Text color="#ff6b35">{DUPLICATE_BADGE}</Text>}
          {isPending && <Text color="yellow">{PENDING_BADGE}</Text>}
        </Text>
      </Box>
      <Box marginLeft={4}>
        <Text color={isError ? 'red' : undefined}>
          {isError ? ERROR_DESCRIPTION_FALLBACK : endpoint.description}
        </Text>
      </Box>
      <Box marginLeft={4}>
        <Text dimColor>
          {endpoint.serverAddress}
          {ADDRESS_SEPARATOR}
          {endpoint.localhostAddress}
        </Text>
      </Box>
      {endpoint.tags.length > 0 && (
        <Box marginLeft={4}>
          <Text color="gray">{endpoint.tags.map((tag) => `#${tag}`).join(' ')}</Text>
        </Box>
      )}
      {endpoint.handlerOptions.length > 1 && (
        <Box marginLeft={4}>
          <Text color="gray">
            {HANDLER_LABEL}
            <Text color={isFocused ? 'cyanBright' : undefined}>
              {activeHandlerOption?.description ?? activeHandlerKey}
            </Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};
