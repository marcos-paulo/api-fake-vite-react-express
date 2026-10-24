import type { Endpoint } from '../../../../../types/endpoints.types';
import { Icon } from '../Icon';
import { MethodBadge } from '../MethodBadge';
import { Switch } from '../Switch';
import styles from './EndpointItem.module.css';
import { HandlerPicker } from './HandlerPicker';

type EndpointItemProps = {
  endpoint: Endpoint;
  displayEnabled: boolean;
  isPending: boolean;
  pendingHandlerKey?: string;
  isLoading: boolean;
  onAddPendingEndpoint: (endpoint: Endpoint) => void;
  onOpenEndpointFile: (fileName: string) => void;
  onChangeActiveHandler: (fileName: string, handlerKey: string) => void;
  onRevertAgentHandler: (fileName: string) => void;
  onRevokeAgentApproval: (fileName: string, handlerKey: string) => void;
};

export const EndpointItem = ({
  endpoint,
  displayEnabled,
  isPending,
  pendingHandlerKey,
  isLoading,
  onAddPendingEndpoint,
  onOpenEndpointFile,
  onChangeActiveHandler,
  onRevertAgentHandler,
  onRevokeAgentApproval,
}: EndpointItemProps) => {
  const isError = endpoint.loadError;
  const selectedHandlerKey = pendingHandlerKey ?? endpoint.activeHandlerKey;
  const hasHandlerChoice = !isError && endpoint.handlerOptions.length > 1;
  const switchLabel = `${displayEnabled ? 'Desabilitar' : 'Habilitar'} ${endpoint.serverAddress}`;

  return (
    <li
      className={styles.item}
      data-has-title={!isError && !!endpoint.title}
      data-state={isError ? 'error' : isPending ? 'pending' : displayEnabled ? 'on' : 'off'}
    >
      <Switch
        checked={displayEnabled}
        label={switchLabel}
        isPending={isPending}
        disabled={isLoading || isError}
        onToggle={() => onAddPendingEndpoint(endpoint)}
      />

      <div className={styles.body}>
        {endpoint.title && !isError && (
          <h3 className={styles.title} title={endpoint.title}>
            {endpoint.title}
          </h3>
        )}

        <div className={styles.titleRow}>
          {!isError && <MethodBadge method={endpoint.method} />}
          <span className={styles.address} title={endpoint.serverAddress}>
            {endpoint.serverAddress}
          </span>
          {isError && (
            <span className={styles.chip} data-tone="error">
              <Icon name="warning" size={12} /> erro ao carregar
            </span>
          )}
          {endpoint.isDuplicate && (
            <span
              className={styles.chip}
              data-tone="duplicate"
              title={`Duplicado em: ${endpoint.duplicateFiles.join(', ')}`}
            >
              <Icon name="duplicate" size={12} /> duplicado
            </span>
          )}
          {isPending && (
            <span className={styles.chip} data-tone="warning">
              não salvo
            </span>
          )}
        </div>

        {!isError && <p className={styles.description}>{endpoint.description}</p>}

        <div className={styles.metaRow}>
          {!isError && (
            <span className={styles.target} title="Destino local">
              → {endpoint.localhostAddress}
            </span>
          )}
          <span className={styles.fileName}>
            <Icon name="file" size={12} /> {endpoint.fileName}
          </span>
        </div>

        {!isError && endpoint.tags.length > 0 && (
          <ul className={styles.tagsRow} aria-label="Tags">
            {endpoint.tags.map((tag) => (
              <li key={`${endpoint.fileName}-${tag}`} className={styles.tag}>
                #{tag}
              </li>
            ))}
          </ul>
        )}

        {hasHandlerChoice && (
          <HandlerPicker
            endpoint={endpoint}
            selectedKey={selectedHandlerKey}
            disabled={isLoading}
            onChange={(handlerKey) => onChangeActiveHandler(endpoint.fileName, handlerKey)}
            onRevert={() => onRevertAgentHandler(endpoint.fileName)}
            onRevoke={(handlerKey) => onRevokeAgentApproval(endpoint.fileName, handlerKey)}
          />
        )}
      </div>

      <button
        type="button"
        className={styles.openButton}
        onClick={() => onOpenEndpointFile(endpoint.fileName)}
        title="Abrir arquivo no editor"
        aria-label={`Abrir ${endpoint.fileName} no editor`}
        disabled={isLoading}
      >
        <Icon name="external" size={14} />
        <span>Abrir</span>
      </button>
    </li>
  );
};
