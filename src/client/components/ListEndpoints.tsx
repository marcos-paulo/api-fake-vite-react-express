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
    color: '#4caf50',
    borderBottom: '2px solid #4caf50',
  } satisfies CSSProperties,

  sectionDisabledHeader: {
    margin: '0 0 8px 0',
    padding: '6px 10px',
    fontSize: '0.85em',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#888',
    borderBottom: '2px solid #888',
  } satisfies CSSProperties,

  sectionEnabledList: {
    border: '1px solid #4caf50',
    padding: '5px 5px 0 5px',
    listStyle: 'none',
    margin: 0,
    minHeight: '40px',
    borderRadius: '4px',
  } satisfies CSSProperties,

  sectionDisabledList: {
    border: '1px solid rgba(128,128,128,0.4)',
    padding: '5px 5px 0 5px',
    listStyle: 'none',
    margin: 0,
    minHeight: '40px',
    borderRadius: '4px',
  } satisfies CSSProperties,

  pendingBadge: {
    marginLeft: '8px',
    color: '#e6a800',
    fontStyle: 'italic',
    fontSize: '0.8em',
    border: '1px solid #e6a800',
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
    border: isPending ? '1px solid #e6a800' : '1px solid rgba(128,128,128,0.4)',
    backgroundColor: isPending ? 'rgba(230, 168, 0, 0.15)' : 'transparent',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
  }),

  endpointItemDescriptionStyle: (isPending: boolean): CSSProperties => ({
    flex: '1 100%',
    color: isPending ? '#e6a800' : 'inherit',
    fontWeight: isPending ? 'bold' : 'normal',
  }),

  listEndpointsContainerStyle: (isLoading: boolean): CSSProperties => ({
    opacity: isLoading ? 0.6 : 1,
    pointerEvents: isLoading ? 'none' : 'auto',
    transition: 'opacity 0.3s ease',
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    alignItems: 'flex-start',
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
    <div style={S.listEndpointsContainerStyle(isLoading)}>
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
    listStyle: S.sectionEnabledList,
  },
  disabled: {
    title: 'Desabilitados',
    headerStyle: S.sectionDisabledHeader,
    listStyle: S.sectionDisabledList,
  },
} satisfies Record<
  'enabled' | 'disabled',
  { title: string; headerStyle: CSSProperties; listStyle: CSSProperties }
>;

const EndpointSection = ({ variant, count, children }: EndpointSectionProps) => {
  const { title, headerStyle, listStyle } = sectionConfig[variant];
  return (
    <div style={S.section}>
      <h3 style={headerStyle}>
        {title} ({count})
      </h3>
      <ul style={listStyle}>{children}</ul>
    </div>
  );
};
