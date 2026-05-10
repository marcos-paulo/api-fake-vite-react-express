import type { CSSProperties } from 'react';

import type { Endpoint, Endpoints } from '../../types/Endpoints';

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

  endpointItemStyle: (isPending: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px',
    padding: '5px',
    marginBottom: '5px',
    border: isPending ? '1px solid var(--color-warning)' : '1px solid var(--color-border-muted)',
    backgroundColor: isPending ? 'var(--color-warning-bg)' : 'transparent',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
  }),

  endpointItemDescriptionStyle: (isPending: boolean): CSSProperties => ({
    flex: '1 100%',
    color: isPending ? 'var(--color-warning)' : 'inherit',
    fontWeight: isPending ? 'bold' : 'normal',
  }),

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
};

type EndpointItemProps = {
  endpoint: Endpoint;
  displayEnabled: boolean;
  isPending: boolean;
  isLoading: boolean;
  onAddPendingEndpoint: (endpoint: Endpoint) => void;
};

// ---------------------------------------------------------------------------
// ListEndpoints
// ---------------------------------------------------------------------------

export const ListEndpoints = ({
  endpoints,
  isLoading = false,
  pendingChanges = new Set(),
  onAddPendingEndpoint,
}: ListEndpointsProps) => {
  const allEndpoints = endpoints?.listEndpoints ?? [];

  const enabled = allEndpoints.filter((ep) => {
    const isPending = pendingChanges.has(ep.localhostAddress);
    return isPending ? !ep.enabled : ep.enabled;
  });

  const disabled = allEndpoints.filter((ep) => {
    const isPending = pendingChanges.has(ep.localhostAddress);
    return isPending ? ep.enabled : !ep.enabled;
  });

  return (
    <div className="flex-scroll-row-hidden" style={S.listEndpointsContainerStyle(isLoading)}>
      <EndpointSection variant="enabled" count={enabled.length}>
        <EmptyMessage show={enabled.length === 0} message="Nenhum endpoint habilitado" />
        {enabled.map((endpoint) => (
          <EndpointItem
            key={endpoint.localhostAddress}
            endpoint={endpoint}
            isPending={pendingChanges.has(endpoint.localhostAddress)}
            displayEnabled={true}
            onAddPendingEndpoint={onAddPendingEndpoint}
            isLoading={isLoading}
          />
        ))}
      </EndpointSection>

      <EndpointSection variant="disabled" count={disabled.length}>
        <EmptyMessage show={disabled.length === 0} message="Nenhum endpoint desabilitado" />
        {disabled.map((endpoint) => (
          <EndpointItem
            key={endpoint.localhostAddress}
            endpoint={endpoint}
            isPending={pendingChanges.has(endpoint.localhostAddress)}
            displayEnabled={false}
            onAddPendingEndpoint={onAddPendingEndpoint}
            isLoading={isLoading}
          />
        ))}
      </EndpointSection>
    </div>
  );
};

// ---------------------------------------------------------------------------
// EndpointItem
// ---------------------------------------------------------------------------

const EndpointItem = ({
  endpoint,
  displayEnabled,
  isPending,
  isLoading,
  onAddPendingEndpoint,
}: EndpointItemProps) => {
  return (
    <li style={S.endpointItemStyle(isPending)}>
      <span style={S.endpointItemDescriptionStyle(isPending)}>{endpoint.description}</span>
      <input
        type="checkbox"
        checked={displayEnabled}
        onChange={() => onAddPendingEndpoint(endpoint)}
        disabled={isLoading}
      />
      <span>{endpoint.serverAddress}</span>
      <span style={S.endpointItemSeparator}> — </span>
      <span style={S.endpointItemAddress}>{endpoint.localhostAddress}</span>
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
