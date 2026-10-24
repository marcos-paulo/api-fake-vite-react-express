import { useCallback, useMemo, useState } from 'react';

import styles from './App.module.css';
import { ActionsBar } from './components/ActionsBar';
import { AgentApprovalsPanel } from './components/AgentApprovalsPanel';
import { FeedbackToast } from './components/FeedbackToast';
import { FilterBar } from './components/FilterBar';
import { ListEndpoints } from './components/ListEndpoints';
import {
  readStoredSort,
  type SortState,
  storeSort,
} from './components/ListEndpoints/sortEndpoints';
import {
  countByStatus,
  matchesStatus,
  type StatusFilter,
} from './components/ListEndpoints/statusFilter';
import {
  countByTag,
  countSelectedTags,
  countUntagged,
  EMPTY_TAG_SELECTION,
  isUntaggedSelected,
  matchesTags,
  type TagMatchMode,
  type TagSelection,
  toggleTagSelection,
} from './components/ListEndpoints/tagFilter';
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
  const [sort, setSort] = useState<SortState>(readStoredSort);

  const handleSortChange = useCallback((next: SortState) => {
    setSort(next);
    storeSort(next);
  }, []);

  const [tagSelection, setTagSelection] = useState<TagSelection>(EMPTY_TAG_SELECTION);
  const [tagMode, setTagMode] = useState<TagMatchMode>('all');

  const handleToggleTag = useCallback((tag: string, forceExclude?: boolean) => {
    setTagSelection((current) => toggleTagSelection(current, tag, forceExclude));
  }, []);
  const handleClearTags = useCallback(() => setTagSelection(EMPTY_TAG_SELECTION), []);

  const getEndpointLabel = useCallback(
    (fileName: string) => {
      const endpoint = endpoints?.listEndpoints.find((item) => item.fileName === fileName);
      return endpoint?.title || endpoint?.serverAddress || fileName;
    },
    [endpoints],
  );

  // Rola até o card do endpoint e o destaca por um instante. Se um filtro o esconde, limpa os
  // filtros e tenta de novo depois do próximo render.
  const handleViewEndpoint = useCallback(
    (fileName: string) => {
      const findCard = () =>
        Array.from(document.querySelectorAll<HTMLElement>('[data-file-name]')).find(
          (element) => element.dataset.fileName === fileName,
        );
      const reveal = (card: HTMLElement) => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        card.scrollIntoView({
          block: 'center',
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
        card.dataset.highlight = 'true';
        window.setTimeout(() => delete card.dataset.highlight, 2000);
      };

      const card = findCard();
      if (card) return reveal(card);

      setFilterText('');
      setStatusFilter('all');
      handleClearTags();
      window.setTimeout(() => {
        const revealed = findCard();
        if (revealed) reveal(revealed);
      }, 100);
    },
    [setFilterText, handleClearTags],
  );

  // Cada faceta (estado, tag) conta sobre o resultado das outras: o número num chip/aba é
  // o que o clique mudaria.
  const searchResult = filteredEndpoints?.listEndpoints;
  const tagFilteredEndpoints = useMemo(
    () => (searchResult ?? []).filter((ep) => matchesTags(ep, tagSelection, tagMode)),
    [searchResult, tagSelection, tagMode],
  );
  const statusCounts = useMemo(() => countByStatus(tagFilteredEndpoints), [tagFilteredEndpoints]);
  const tagCounts = useMemo(() => {
    // "Todas" afunila: o número de uma tag é quanto sobra ao somá-la às já incluídas. "Qualquer" e
    // "Sem tag" (que substitui a seleção) não somam, então a contagem parte só da busca e do estado.
    // As exclusões ficam de fora do escopo: countByTag as aplica tag a tag.
    const isNarrowing = tagMode === 'all' && !isUntaggedSelected(tagSelection);
    const scope = (searchResult ?? []).filter(
      (ep) =>
        matchesStatus(ep, statusFilter) &&
        (!isNarrowing ||
          matchesTags(ep, { included: tagSelection.included, excluded: [] }, tagMode)),
    );
    return countByTag(endpoints?.listEndpoints ?? [], scope, tagSelection.excluded);
  }, [endpoints, searchResult, tagSelection, tagMode, statusFilter]);
  const untaggedTotal = useMemo(() => countUntagged(endpoints?.listEndpoints ?? []), [endpoints]);
  const untaggedCount = useMemo(
    () => countUntagged((searchResult ?? []).filter((ep) => matchesStatus(ep, statusFilter))),
    [searchResult, statusFilter],
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
          <AgentApprovalsPanel
            pendingApprovals={pendingApprovals}
            errorMessage={errorMessage}
            onApprove={approveHandlers}
            getEndpointLabel={getEndpointLabel}
            onViewEndpoint={handleViewEndpoint}
          />
        </div>
        <FilterBar
          value={filterText}
          onChange={setFilterText}
          statusFilter={statusFilter}
          statusCounts={statusCounts}
          onStatusChange={setStatusFilter}
          sort={sort}
          onSortChange={handleSortChange}
        />
        <TagFilter
          tags={tagCounts}
          untagged={untaggedTotal > 0 ? { count: untaggedCount } : null}
          selection={tagSelection}
          mode={tagMode}
          onToggleTag={handleToggleTag}
          onModeChange={setTagMode}
          onClear={handleClearTags}
        />
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          <ListEndpoints
            endpoints={visibleEndpoints}
            statusFilter={statusFilter}
            sort={sort}
            tagSelection={tagSelection}
            hasActiveSearch={filterText.trim() !== '' || countSelectedTags(tagSelection) > 0}
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
