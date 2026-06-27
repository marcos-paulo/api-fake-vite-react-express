import type { CSSProperties } from 'react';

import type { Endpoint, Endpoints } from '../../types/Endpoints';
import type { FailedModuleRecord } from '../../types/dynamic-endpoints.types';

// ---------------------------------------------------------------------------
// Estilos estáticos (nível de módulo)
// ---------------------------------------------------------------------------
const S = {
  endpointItemSeparator: {
    opacity: 0.5,
  } satisfies CSSProperties,

  endpointItemAddress: {
    opacity: 0.8,
  } satisfies CSSProperties,

  emptyMessage: {
    padding: '8px',
    opacity: 0.5,
    fontStyle: 'italic',
    fontSize: '0.9em',
  } satisfies CSSProperties,

  section: {
    flex: 1,
    minWidth: 0,
  } satisfies CSSProperties,

  sectionEnabledHeader: {
    margin: '0 0 8px 0',
    padding: '6px 10px',
    fontSize: '0.85em',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--color-success)',
    borderBottom: '2px solid var(--color-success)',
  } satisfies CSSProperties,

  sectionDisabledHeader: {
    margin: '0 0 8px 0',
    padding: '6px 10px',
    fontSize: '0.85em',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--color-text-dim)',
    borderBottom: '2px solid var(--color-text-dim)',
  } satisfies CSSProperties,

  sectionEnabledUnorderedList: {
    border: '1px solid var(--color-success)',
    padding: '5px 5px 0 5px',
    listStyle: 'none',
    margin: 0,
    borderRadius: '4px',
  } satisfies CSSProperties,

  sectionDisabledUnorderedList: {
    border: '1px solid var(--color-border-muted)',
    padding: '5px 5px 0 5px',
    listStyle: 'none',
    margin: 0,
    borderRadius: '4px',
  } satisfies CSSProperties,

  pendingBadge: {
    marginLeft: '8px',
    color: 'var(--color-warning)',
    fontStyle: 'italic',
    fontSize: '0.8em',
    border: '1px solid var(--color-warning)',
    borderRadius: '4px',
    padding: '1px 6px',
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

  openFileButton: {
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid var(--color-border-muted)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: '0.8em',
  } satisfies CSSProperties,

  itemActionContainer: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
  } satisfies CSSProperties,

  endpointItemStyle: (isPending: boolean, isError: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px',
    padding: '5px',
    marginBottom: '5px',
    border: isError
      ? '1px solid var(--color-error)'
      : isPending
        ? '1px solid var(--color-warning)'
        : '1px solid var(--color-border-muted)',
    backgroundColor: isError
      ? 'var(--color-error-bg, rgba(255,50,50,0.08))'
      : isPending
        ? 'var(--color-warning-bg)'
        : 'transparent',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
  }),

  endpointItemDescriptionStyle: (isPending: boolean, isError: boolean): CSSProperties => ({
    flex: '1 1 auto',
    minWidth: 0,
    color: isError ? 'var(--color-error)' : isPending ? 'var(--color-warning)' : 'inherit',
    fontWeight: isError || isPending ? 'bold' : 'normal',
  }),

  endpointMetaRow: {
    flex: '1 1 100%',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } satisfies CSSProperties,

  listEndpointsContainerStyle: (isLoading: boolean): CSSProperties => ({
    opacity: isLoading ? 0.6 : 1,
    pointerEvents: isLoading ? 'none' : 'auto',
    transition: 'opacity 0.3s ease',
    width: '100%',
    boxSizing: 'border-box',
  }),
};

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type ListEndpointsProps = {
  endpoints: Endpoints | null;
  pendingChanges?: Set<string>;
  isLoading?: boolean;
  onAddPendingEndpoint: (endpoint: Endpoint) => void;
  onOpenEndpointFile: (fileName: string) => void;
};

type EndpointItemProps = {
  endpoint: Endpoint;
  displayEnabled: boolean;
  isPending: boolean;
  isLoading: boolean;
  onAddPendingEndpoint: (endpoint: Endpoint) => void;
  onOpenEndpointFile: (fileName: string) => void;
};

// ---------------------------------------------------------------------------
// ListEndpoints
// ---------------------------------------------------------------------------

export const ListEndpoints = ({
  endpoints,
  isLoading = false,
  pendingChanges = new Set(),
  onAddPendingEndpoint,
  onOpenEndpointFile,
}: ListEndpointsProps) => {
  const allEndpoints = endpoints?.listEndpoints ?? [];
  const failedFiles = endpoints?.failedFiles ?? [];

  // Arquivos com erro já representados em listEndpoints (tinham endpoints habilitados previamente)
  const filesAlreadyInList = new Set(
    allEndpoints.filter((ep) => ep.loadError).map((ep) => ep.fileName),
  );

  // failedFiles que NÃO têm nenhuma entrada em listEndpoints → só aparecem na lista de desabilitados
  const failedFilesNotInList = failedFiles.filter((ff) => !filesAlreadyInList.has(ff.fileName));

  // loadError entries first, then normal entries — cada arquivo aparece em apenas UMA lista
  const enabled = [
    ...allEndpoints.filter((ep) => ep.loadError && ep.enabled),
    ...allEndpoints.filter((ep) => {
      if (ep.loadError) return false;
      const isPending = pendingChanges.has(ep.localhostAddress);
      return isPending ? !ep.enabled : ep.enabled;
    }),
  ];

  const disabled = [
    ...allEndpoints.filter((ep) => ep.loadError && !ep.enabled),
    ...allEndpoints.filter((ep) => {
      if (ep.loadError) return false;
      const isPending = pendingChanges.has(ep.localhostAddress);
      return isPending ? ep.enabled : !ep.enabled;
    }),
  ];

  const enabledCount = enabled.length;
  const disabledCount = disabled.length + failedFilesNotInList.length;

  return (
    <div className="flex-scroll-row-hidden" style={S.listEndpointsContainerStyle(isLoading)}>
      <EndpointSection variant="enabled" count={enabledCount}>
        <EmptyMessage show={enabledCount === 0} message="Nenhum endpoint habilitado" />
        {enabled.map((endpoint) => (
          <EndpointItem
            key={endpoint.serverAddress + endpoint.fileName}
            endpoint={endpoint}
            isPending={pendingChanges.has(endpoint.localhostAddress)}
            displayEnabled={true}
            onAddPendingEndpoint={onAddPendingEndpoint}
            onOpenEndpointFile={onOpenEndpointFile}
            isLoading={isLoading}
          />
        ))}
      </EndpointSection>

      <EndpointSection variant="disabled" count={disabledCount}>
        <EmptyMessage show={disabledCount === 0} message="Nenhum endpoint desabilitado" />
        {failedFilesNotInList.map((record) => (
          <FailedFileItem
            key={record.fileName}
            record={record}
            onOpenEndpointFile={onOpenEndpointFile}
          />
        ))}
        {disabled.map((endpoint) => (
          <EndpointItem
            key={endpoint.serverAddress || endpoint.fileName}
            endpoint={endpoint}
            isPending={pendingChanges.has(endpoint.localhostAddress)}
            displayEnabled={false}
            onAddPendingEndpoint={onAddPendingEndpoint}
            onOpenEndpointFile={onOpenEndpointFile}
            isLoading={isLoading}
          />
        ))}
      </EndpointSection>
    </div>
  );
};

// ---------------------------------------------------------------------------
// FailedFileItem
// ---------------------------------------------------------------------------

const FailedFileItem = ({
  record,
  onOpenEndpointFile,
}: {
  record: FailedModuleRecord;
  onOpenEndpointFile: (fileName: string) => void;
}) => (
  <li style={S.endpointItemStyle(false, true)}>
    <span style={S.endpointItemDescriptionStyle(false, true)}>Erro ao carregar módulo</span>
    <span
      style={{
        color: 'var(--color-error)',
        fontFamily: 'monospace',
        fontSize: '0.85em',
      }}
    >
      📄 {record.fileName}
    </span>
    <button
      type="button"
      onClick={() => onOpenEndpointFile(record.fileName)}
      style={S.openFileButton}
      title="Abrir arquivo no VS Code"
    >
      Abrir arquivo
    </button>
    <span style={S.errorBadge}>erro</span>
  </li>
);

// ---------------------------------------------------------------------------
// EndpointItem
// ---------------------------------------------------------------------------

const EndpointItem = ({
  endpoint,
  displayEnabled,
  isPending,
  isLoading,
  onAddPendingEndpoint,
  onOpenEndpointFile,
}: EndpointItemProps) => {
  const isError = endpoint.loadError;
  return (
    <li style={S.endpointItemStyle(isPending, isError)}>
      <input
        type="checkbox"
        checked={displayEnabled}
        onChange={() => onAddPendingEndpoint(endpoint)}
        disabled={isLoading || isError}
      />
      {endpoint.fileName && (
        <span style={{ opacity: 0.7, fontSize: '0.8em', fontFamily: 'monospace' }}>
          📄 {endpoint.fileName}
        </span>
      )}
      <span style={S.endpointItemDescriptionStyle(isPending, isError)}>
        {isError ? 'Erro ao carregar módulo' : endpoint.description}
      </span>
      {endpoint.fileName && (
        <div style={S.itemActionContainer}>
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
      )}
      <div style={S.endpointMetaRow}>
        {isError ? (
          <>
            <span style={{ color: 'var(--color-error)' }}>{endpoint.serverAddress}</span>
            <span style={S.errorBadge}>erro</span>
          </>
        ) : (
          <>
            <span>{endpoint.serverAddress}</span>
            <span style={S.endpointItemSeparator}> — </span>
            <span style={S.endpointItemAddress}>{endpoint.localhostAddress}</span>
          </>
        )}
      </div>
      <PendingBadge isPending={isPending} />
    </li>
  );
};

// ---------------------------------------------------------------------------
// EmptyMessage
// ---------------------------------------------------------------------------

const EmptyMessage = ({ show, message }: { show: boolean; message: string }) => {
  if (!show) return null;
  return <li style={S.emptyMessage}>{message}</li>;
};

// ---------------------------------------------------------------------------
// PendingBadge
// ---------------------------------------------------------------------------

const PendingBadge = ({ isPending }: { isPending: boolean }) => {
  if (!isPending) return null;
  return <span style={S.pendingBadge}>pendente</span>;
};

// ---------------------------------------------------------------------------
// EndpointSection
// ---------------------------------------------------------------------------

type EndpointSectionProps = {
  variant: 'enabled' | 'disabled';
  count: number;
  children: React.ReactNode;
};

const sectionConfig = {
  enabled: {
    title: 'Habilitados',
    headerStyle: S.sectionEnabledHeader,
    unorderedListStyle: S.sectionEnabledUnorderedList,
  },
  disabled: {
    title: 'Desabilitados',
    headerStyle: S.sectionDisabledHeader,
    unorderedListStyle: S.sectionDisabledUnorderedList,
  },
} satisfies Record<
  'enabled' | 'disabled',
  { title: string; headerStyle: CSSProperties; unorderedListStyle: CSSProperties }
>;

const EndpointSection = ({ variant, count, children }: EndpointSectionProps) => {
  const { title, headerStyle, unorderedListStyle } = sectionConfig[variant];
  return (
    <div className="flex-scroll-column-hidden" style={S.section}>
      <h3 style={headerStyle}>
        {title} ({count})
      </h3>
      <ul className="flex-scroll-column-auto" style={unorderedListStyle}>
        {children}
      </ul>
    </div>
  );
};
