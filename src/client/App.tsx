import { ActionsBar } from './components/ActionsBar';
import { FeedbackToast } from './components/FeedbackToast';
import { FilterBar } from './components/FilterBar';
import { ListEndpoints } from './components/ListEndpoints';
import { LoadingOverlay } from './components/LoadingOverlay';
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

  const { filterText, setFilterText, filteredEndpoints } = useEndpointFilter(endpoints);

  return (
    <>
      <FeedbackToast message={feedbackMessage} />

      <LoadingOverlay loadingState={loadingState} />

      <FilterBar value={filterText} onChange={setFilterText} />

      <ListEndpoints
        endpoints={filteredEndpoints}
        isLoading={loadingState !== 'idle'}
        pendingChanges={pendingChangeKeys}
        pendingHandlerChanges={pendingHandlerChanges}
        onAddPendingEndpoint={onAddPendingEndpoint}
        onOpenEndpointFile={onOpenEndpointFile}
        onChangeActiveHandler={onAddPendingHandlerChange}
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
