import { useMemo, useState } from 'react';

import styles from './App.module.css';
import { ActionsBar } from './components/ActionsBar';
import { AgentApprovalsPanel } from './components/AgentApprovalsPanel';
import { FeedbackToast } from './components/FeedbackToast';
import { FilterBar } from './components/FilterBar';
import { ListEndpoints } from './components/ListEndpoints';
import { countByStatus, type StatusFilter } from './components/ListEndpoints/statusFilter';
import { LoadingBar } from './components/LoadingBar';
import { PanelTokenGate } from './components/PanelTokenGate';
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

  // Contagens sobre o resultado da busca: as abas mostram quanto sobra em cada estado
  const statusCounts = useMemo(
    () => countByStatus(filteredEndpoints?.listEndpoints ?? []),
    [filteredEndpoints],
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
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          <AgentApprovalsPanel
            pendingApprovals={pendingApprovals}
            errorMessage={errorMessage}
            onApprove={approveHandlers}
          />

          <ListEndpoints
            endpoints={filteredEndpoints}
            statusFilter={statusFilter}
            hasActiveSearch={filterText.trim() !== ''}
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
