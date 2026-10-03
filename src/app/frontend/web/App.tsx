import { ActionsBar } from './components/ActionsBar';
import { AgentApprovalsPanel } from './components/AgentApprovalsPanel';
import { FeedbackToast } from './components/FeedbackToast';
import { FilterBar } from './components/FilterBar';
import { ListEndpoints } from './components/ListEndpoints';
import { LoadingOverlay } from './components/LoadingOverlay';
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

  return (
    <>
      <FeedbackToast message={feedbackMessage} />

      <PanelTokenGate />

      <LoadingOverlay loadingState={loadingState} />

      <FilterBar value={filterText} onChange={setFilterText} />

      <AgentApprovalsPanel
        pendingApprovals={pendingApprovals}
        errorMessage={errorMessage}
        onApprove={approveHandlers}
      />

      <ListEndpoints
        endpoints={filteredEndpoints}
        isLoading={loadingState !== 'idle'}
        pendingChanges={pendingChangeKeys}
        pendingHandlerChanges={pendingHandlerChanges}
        onAddPendingEndpoint={onAddPendingEndpoint}
        onOpenEndpointFile={onOpenEndpointFile}
        onChangeActiveHandler={onAddPendingHandlerChange}
        onRevertAgentHandler={revertAgentHandler}
        onRevokeAgentApproval={revokeHandler}
      />

      <ActionsBar
        count={totalPendingCount}
        isDisabled={loadingState !== 'idle'}
        onDiscard={discardChanges}
        onSave={saveChanges}
      />
    </>
  );
}
