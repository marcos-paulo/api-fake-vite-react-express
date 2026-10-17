import type { Endpoint, Endpoints } from '../../../../../types/endpoints.types';
import { EmptyMessage } from './EmptyMessage';
import { EndpointItem } from './EndpointItem';
import { EndpointSection } from './EndpointSection';
import styles from './ListEndpoints.module.css';
import { matchesStatus, type StatusFilter } from './statusFilter';

type ListEndpointsProps = {
  endpoints: Endpoints | null;
  statusFilter: StatusFilter;
  hasActiveSearch: boolean;
  pendingChanges?: Set<string>;
  pendingHandlerChanges?: Record<string, string>;
  isLoading?: boolean;
  onAddPendingEndpoint: (endpoint: Endpoint) => void;
  onOpenEndpointFile: (fileName: string) => void;
  onChangeActiveHandler: (fileName: string, handlerKey: string) => void;
  onRevertAgentHandler: (fileName: string) => void;
  onRevokeAgentApproval: (fileName: string, handlerKey: string) => void;
};

export const ListEndpoints = ({
  endpoints,
  statusFilter,
  hasActiveSearch,
  isLoading = false,
  pendingChanges = new Set(),
  pendingHandlerChanges = {},
  onAddPendingEndpoint,
  onOpenEndpointFile,
  onChangeActiveHandler,
  onRevertAgentHandler,
  onRevokeAgentApproval,
}: ListEndpointsProps) => {
  const visible = (endpoints?.listEndpoints ?? []).filter((ep) => matchesStatus(ep, statusFilter));

  // Erros primeiro dentro de cada grupo, para não ficarem escondidos no fim da lista
  const sortErrorsFirst = (list: Endpoint[]) => [
    ...list.filter((ep) => ep.loadError),
    ...list.filter((ep) => !ep.loadError),
  ];

  const enabled = sortErrorsFirst(visible.filter((ep) => ep.enabled));
  const disabled = sortErrorsFirst(visible.filter((ep) => !ep.enabled));

  const renderItem = (endpoint: Endpoint) => {
    const isToggled = pendingChanges.has(endpoint.fileName);
    return (
      <EndpointItem
        key={endpoint.fileName}
        endpoint={endpoint}
        isPending={isToggled || endpoint.fileName in pendingHandlerChanges}
        pendingHandlerKey={pendingHandlerChanges[endpoint.fileName]}
        displayEnabled={isToggled ? !endpoint.enabled : endpoint.enabled}
        onAddPendingEndpoint={onAddPendingEndpoint}
        onOpenEndpointFile={onOpenEndpointFile}
        onChangeActiveHandler={onChangeActiveHandler}
        onRevertAgentHandler={onRevertAgentHandler}
        onRevokeAgentApproval={onRevokeAgentApproval}
        isLoading={isLoading}
      />
    );
  };

  if (visible.length === 0) {
    return (
      <div className={styles.list}>
        <EmptyMessage
          message={
            hasActiveSearch || statusFilter !== 'all'
              ? 'Nenhum endpoint corresponde ao filtro atual.'
              : 'Nenhum endpoint encontrado na pasta endpoints/ do workspace ativo.'
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.list} data-loading={isLoading || undefined}>
      {enabled.length > 0 && (
        <EndpointSection variant="enabled" count={enabled.length} showHeader={disabled.length > 0}>
          {enabled.map(renderItem)}
        </EndpointSection>
      )}
      {disabled.length > 0 && (
        <EndpointSection variant="disabled" count={disabled.length} showHeader={enabled.length > 0}>
          {disabled.map(renderItem)}
        </EndpointSection>
      )}
    </div>
  );
};
