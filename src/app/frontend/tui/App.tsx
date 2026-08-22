import { Box, Text, useApp, useInput } from 'ink';
import { useCallback, useState } from 'react';

import { EndpointList } from './components/EndpointList';
import { FilterInput } from './components/FilterInput';
import { StatusBar } from './components/StatusBar';
import { useEndpointFilter } from './hooks/useEndpointFilter';
import { useEndpoints } from './hooks/useEndpoints';
import { useTerminalSize } from './hooks/useTerminalSize';

type Mode = 'list' | 'filter';

export const App = () => {
  const {
    endpoints,
    loadingState,
    feedbackMessage,
    pendingChangeKeys,
    pendingHandlerChanges,
    totalPendingCount,
    onAddPendingEndpoint,
    onAddPendingHandlerChange,
    onOpenEndpointFile,
    discardChanges,
    saveChanges,
  } = useEndpoints();

  const { filterText, setFilterText, filteredEndpoints } = useEndpointFilter(endpoints);
  const { rows } = useTerminalSize();

  const [mode, setMode] = useState<Mode>('list');
  const [focusedFileName, setFocusedFileName] = useState<string | null>(null);

  const { exit } = useApp();

  const onCycleHandler = useCallback(
    (fileName: string, direction: 1 | -1) => {
      const endpoint = endpoints?.listEndpoints.find((ep) => ep.fileName === fileName);
      if (!endpoint || endpoint.handlerOptions.length < 2) return;

      const currentKey = pendingHandlerChanges[fileName] ?? endpoint.activeHandlerKey;
      const currentIndex = endpoint.handlerOptions.findIndex((option) => option.key === currentKey);
      const nextIndex =
        (currentIndex + direction + endpoint.handlerOptions.length) %
        endpoint.handlerOptions.length;
      const nextOption = endpoint.handlerOptions[nextIndex];
      if (nextOption) onAddPendingHandlerChange(fileName, nextOption.key);
    },
    [endpoints, pendingHandlerChanges, onAddPendingHandlerChange],
  );

  useInput(
    (input) => {
      if (input === 'f' || input === '/') {
        setMode('filter');
      } else if (input === 's' && totalPendingCount > 0 && loadingState === 'idle') {
        void saveChanges();
      } else if (input === 'd' && totalPendingCount > 0) {
        discardChanges();
      } else if (input === 'q') {
        exit();
      }
    },
    { isActive: mode === 'list' },
  );

  useInput(
    (input, key) => {
      // Se o terminal entregar teclas em lote (ex: usuário digita o filtro e
      // aperta Enter rápido demais, sem pausa), o Ink recebe tudo isso como
      // um único evento "colado" (ver docs do useInput) — e o Enter/Escape
      // deixa de ser reconhecido como tecla especial (key.return/key.escape
      // só vêm true quando o evento inteiro é exatamente essa tecla, não
      // quando ela está embutida no meio de um texto maior). Sem esse
      // fallback checando o caractere bruto, o app ficava travado no modo
      // filtro pra sempre, engolindo teclas de navegação como texto.
      // eslint-disable-next-line no-control-regex
      if (key.escape || key.return || /[\r\n\x1B]/.test(input)) {
        setMode('list');
      }
    },
    { isActive: mode === 'filter' },
  );

  return (
    <Box flexDirection="column" height={rows}>
      <Box marginBottom={1}>
        <Text bold color="cyanBright">
          api-fake — TUI
        </Text>
      </Box>

      <FilterInput value={filterText} isActive={mode === 'filter'} onChange={setFilterText} />

      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        <EndpointList
          endpoints={filteredEndpoints}
          isActive={mode === 'list'}
          isLoading={loadingState !== 'idle'}
          pendingChanges={pendingChangeKeys}
          pendingHandlerChanges={pendingHandlerChanges}
          focusedFileName={focusedFileName}
          onFocusChange={setFocusedFileName}
          onToggleEndpoint={onAddPendingEndpoint}
          onCycleHandler={onCycleHandler}
          onOpenEndpointFile={onOpenEndpointFile}
        />
      </Box>

      <StatusBar
        loadingState={loadingState}
        feedbackMessage={feedbackMessage}
        pendingCount={totalPendingCount}
      />
    </Box>
  );
};
