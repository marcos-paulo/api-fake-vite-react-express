import type { CSSProperties } from 'react';

import type { Endpoint } from '../../../../../types/endpoints.types';
import { PendingBadge } from './PendingBadge';

const S = {
  endpointItemSeparator: {
    opacity: 0.5,
  } satisfies CSSProperties,

  endpointItemAddress: {
    opacity: 0.8,
  } satisfies CSSProperties,

  endpointItemFileName: {
    opacity: 0.7,
    fontSize: '0.8em',
    fontFamily: 'monospace',
  } satisfies CSSProperties,

  errorBadge: {
    marginLeft: '8px',
    color: 'var(--color-error)',
    fontStyle: 'italic',
    fontSize: '0.8em',
    border: '1px solid var(--color-error)',
    borderRadius: '4px',
    padding: '1px 6px',
  } satisfies CSSProperties,

  duplicateBadge: {
    marginLeft: '8px',
    color: '#ff6b35',
    fontStyle: 'italic',
    fontSize: '0.8em',
    border: '1px solid #ff6b35',
    borderRadius: '4px',
    padding: '1px 6px',
  } satisfies CSSProperties,

  openFileButton: {
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid var(--color-border-muted)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: '0.8em',
  } satisfies CSSProperties,

  endpointItemStyle: (isPending: boolean, isError: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: '4px',
    padding: '5px',
    marginBottom: '5px',
    border: isError
      ? '1px solid var(--color-error)'
      : isPending
        ? '1px solid var(--color-warning)'
        : '1px solid var(--color-border-muted)',
    backgroundColor: isError
      ? 'var(--color-error-bg)'
      : isPending
        ? 'var(--color-warning-bg)'
        : 'transparent',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
  }),

  endpointItemCheckboxAndName: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: '0 1 auto',
  } satisfies CSSProperties,

  endpointItemBadgesContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: '0 1 auto',
  } satisfies CSSProperties,

  endpointItemActionButton: {
    marginLeft: 'auto',
    flex: '0 0 auto',
  } satisfies CSSProperties,

  endpointItemDescription: {
    flex: '1 1 100%',
    minWidth: 0,
  } satisfies CSSProperties,

  endpointItemDescriptionText: (isError: boolean, isPending: boolean): CSSProperties => ({
    color: isError ? 'var(--color-error)' : isPending ? 'var(--color-warning)' : 'inherit',
    fontWeight: isError || isPending ? 'bold' : 'normal',
  }),

  endpointItemMetaRow: {
    flex: '1 1 100%',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } satisfies CSSProperties,

  endpointItemMetaError: {
    color: 'var(--color-error)',
  } satisfies CSSProperties,

  endpointItemTagsRow: {
    flex: '1 1 100%',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
  } satisfies CSSProperties,

  endpointTagBadge: {
    padding: '2px 8px',
    borderRadius: '999px',
    border: '1px solid var(--color-border-muted)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text-muted)',
    fontSize: '0.75em',
    fontWeight: 600,
  } satisfies CSSProperties,

  handlerSelectRow: {
    flex: '1 1 100%',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } satisfies CSSProperties,

  handlerSelectLabel: {
    opacity: 0.7,
    fontSize: '0.8em',
  } satisfies CSSProperties,

  handlerSelect: {
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid var(--color-border-muted)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: '0.8em',
  } satisfies CSSProperties,
};

type EndpointItemProps = {
  endpoint: Endpoint;
  displayEnabled: boolean;
  isPending: boolean;
  pendingHandlerKey?: string;
  isLoading: boolean;
  onAddPendingEndpoint: (endpoint: Endpoint) => void;
  onOpenEndpointFile: (fileName: string) => void;
  onChangeActiveHandler: (fileName: string, handlerKey: string) => void;
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
}: EndpointItemProps) => {
  const isError = endpoint.loadError;

  return (
    <li style={S.endpointItemStyle(isPending, isError)}>
      {/* Linha 1: Checkbox, Nome e Badges à esquerda | Botão à direita */}
      <div style={S.endpointItemCheckboxAndName}>
        <input
          type="checkbox"
          checked={displayEnabled}
          onChange={() => onAddPendingEndpoint(endpoint)}
          disabled={isLoading || isError}
        />
        <span style={S.endpointItemFileName}>📄 {endpoint.fileName}</span>
      </div>

      <div style={S.endpointItemBadgesContainer}>
        {isError && <span style={S.errorBadge}>erro</span>}
        {endpoint.isDuplicate && (
          <span
            style={S.duplicateBadge}
            title={`Duplicado em: ${endpoint.duplicateFiles.join(', ')}`}
          >
            🔁 duplicado, {endpoint.duplicateFiles.join(', ')}
          </span>
        )}
        <PendingBadge isPending={isPending} />
      </div>

      <div style={S.endpointItemActionButton}>
        <button
          type="button"
          onClick={() => onOpenEndpointFile(endpoint.fileName)}
          style={S.openFileButton}
          title="Abrir arquivo no VS Code"
          disabled={isLoading}
        >
          Abrir arquivo
        </button>
      </div>

      {/* Linha 2: Descrição */}
      <div style={S.endpointItemDescription}>
        <span style={S.endpointItemDescriptionText(isError, isPending)}>
          {isError ? 'Erro ao carregar módulo' : endpoint.description}
        </span>
      </div>

      {/* Linha 3: Endereço do servidor */}
      <div style={S.endpointItemMetaRow}>
        {isError ? (
          <span style={S.endpointItemMetaError}>{endpoint.serverAddress}</span>
        ) : (
          <>
            <span>{endpoint.serverAddress}</span>
            <span style={S.endpointItemSeparator}> — </span>
            <span style={S.endpointItemAddress}>{endpoint.localhostAddress}</span>
          </>
        )}
      </div>

      {/* Linha 4: Tags */}
      {!isError && endpoint.tags.length > 0 && (
        <div style={S.endpointItemTagsRow}>
          {endpoint.tags.map((tag) => (
            <span key={`${endpoint.fileName}-${tag}`} style={S.endpointTagBadge}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Linha 5: Seletor de handler (só quando há mais de uma variante de resposta) */}
      {!isError && endpoint.handlerOptions.length > 1 && (
        <div style={S.handlerSelectRow}>
          <span style={S.handlerSelectLabel}>Resposta:</span>
          <select
            style={S.handlerSelect}
            value={pendingHandlerKey ?? endpoint.activeHandlerKey}
            disabled={isLoading}
            onChange={(e) => onChangeActiveHandler(endpoint.fileName, e.target.value)}
          >
            {endpoint.handlerOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.description}
              </option>
            ))}
          </select>
        </div>
      )}
    </li>
  );
};
