import { useCallback, useMemo, useState } from 'react';

import styles from './App.module.css';
import { ActionsBar } from './components/ActionsBar';
import { AgentApprovalsPanel } from './components/AgentApprovalsPanel';
import { FeedbackToast } from './components/FeedbackToast';
import { FilterBar } from './components/FilterBar';
import { ListEndpoints } from './components/ListEndpoints';
import {
  countByStatus,
  matchesStatus,
  type StatusFilter,
} from './components/ListEndpoints/statusFilter';
import { countByTag, matchesTags, type TagMatchMode } from './components/ListEndpoints/tagFilter';
import { LoadingBar } from './components/LoadingBar';
import { PanelTokenGate } from './components/PanelTokenGate';
import { TagFilter } from './components/TagFilter';
import { useAgentApprovals } from './hooks/useAgentApprovals';
import { useEndpointFilter } from './hooks/useEndpointFilter';
import { useEndpoints } from './hooks/useEndpoints';

export default function App() {
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

  const { pendingApprovals, errorMessage, approveHandlers, revokeHandler, revertAgentHandler } =
    useAgentApprovals(endpoints);

  const { filterText, setFilterText, filteredEndpoints } = useEndpointFilter(endpoints);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<TagMatchMode>('all');

  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }, []);
  const handleClearTags = useCallback(() => setSelectedTags([]), []);

  // Cada faceta (estado, tag) conta sobre o resultado das outras: o número num chip/aba é
  // quanto sobra se você clicar nele.
  const searchResult = filteredEndpoints?.listEndpoints;
  const tagFilteredEndpoints = useMemo(
    () => (searchResult ?? []).filter((ep) => matchesTags(ep, selectedTags, tagMode)),
    [searchResult, selectedTags, tagMode],
  );
  const statusCounts = useMemo(() => countByStatus(tagFilteredEndpoints), [tagFilteredEndpoints]);
  const tagCounts = useMemo(
    () =>
      countByTag(
        endpoints?.listEndpoints ?? [],
        // "Todas" afunila: o número de uma tag é quanto sobra ao somá-la às já marcadas.
        // "Qualquer" amplia, então a contagem parte só da busca e do estado.
        (tagMode === 'all' ? tagFilteredEndpoints : (searchResult ?? [])).filter((ep) =>
          matchesStatus(ep, statusFilter),
        ),
      ),
    [endpoints, searchResult, tagFilteredEndpoints, tagMode, statusFilter],
  );
  const visibleEndpoints = useMemo(
    () => (filteredEndpoints ? { listEndpoints: tagFilteredEndpoints } : null),
    [filteredEndpoints, tagFilteredEndpoints],
  );

  const isBusy = loadingState !== 'idle';

  return (
    <>
      <FeedbackToast message={feedbackMessage} />
      <PanelTokenGate />
      <LoadingBar loadingState={loadingState} />

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>API Fake</h1>
          <p className={styles.summary}>
            {statusCounts.enabled} de {endpoints?.listEndpoints.length ?? 0} endpoints habilitados
          </p>
        </div>
        <FilterBar
          value={filterText}
          onChange={setFilterText}
          statusFilter={statusFilter}
          statusCounts={statusCounts}
          onStatusChange={setStatusFilter}
        />
        <TagFilter
          tags={tagCounts}
          selectedTags={selectedTags}
          mode={tagMode}
          onToggleTag={handleToggleTag}
          onModeChange={setTagMode}
          onClear={handleClearTags}
        />
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          <AgentApprovalsPanel
            pendingApprovals={pendingApprovals}
            errorMessage={errorMessage}
            onApprove={approveHandlers}
          />

          <ListEndpoints
            endpoints={visibleEndpoints}
            statusFilter={statusFilter}
            selectedTags={selectedTags}
            hasActiveSearch={filterText.trim() !== '' || selectedTags.length > 0}
            onToggleTag={handleToggleTag}
            isLoading={isBusy}
            pendingChanges={pendingChangeKeys}
            pendingHandlerChanges={pendingHandlerChanges}
            onAddPendingEndpoint={onAddPendingEndpoint}
            onOpenEndpointFile={onOpenEndpointFile}
            onChangeActiveHandler={onAddPendingHandlerChange}
            onRevertAgentHandler={revertAgentHandler}
            onRevokeAgentApproval={revokeHandler}
          />
        </div>
      </main>

      <ActionsBar
        count={totalPendingCount}
        isDisabled={isBusy}
        onDiscard={discardChanges}
        onSave={saveChanges}
      />
    </>
  );
}
