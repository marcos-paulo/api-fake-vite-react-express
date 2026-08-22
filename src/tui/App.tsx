import { Box, Text, useApp, useInput } from 'ink';
import { useCallback, useState } from 'react';

import { EndpointList } from './components/EndpointList';
import { FilterInput } from './components/FilterInput';
import { StatusBar } from './components/StatusBar';
import { useEndpointFilter } from './hooks/useEndpointFilter';
import { useEndpoints } from './hooks/useEndpoints';

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
    (_input, key) => {
      if (key.escape || key.return) {
        setMode('list');
      }
    },
    { isActive: mode === 'filter' },
  );

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">
          api-fake — TUI
        </Text>
      </Box>

      <FilterInput value={filterText} isActive={mode === 'filter'} onChange={setFilterText} />

      <Box marginTop={1}>
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
