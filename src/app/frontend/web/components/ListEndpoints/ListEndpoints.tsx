import type { CSSProperties } from 'react';

import type { Endpoint, Endpoints } from '../../../../../types/endpoints.types';
import { EmptyMessage } from './EmptyMessage';
import { EndpointItem } from './EndpointItem';
import { EndpointSection } from './EndpointSection';

const S = {
  listEndpointsContainerStyle: (isLoading: boolean): CSSProperties => ({
    opacity: isLoading ? 0.6 : 1,
    pointerEvents: isLoading ? 'none' : 'auto',
    transition: 'opacity 0.3s ease',
    width: '100%',
    boxSizing: 'border-box',
  }),
};

type ListEndpointsProps = {
  endpoints: Endpoints | null;
  pendingChanges?: Set<string>;
  pendingHandlerChanges?: Record<string, string>;
  isLoading?: boolean;
  onAddPendingEndpoint: (endpoint: Endpoint) => void;
  onOpenEndpointFile: (fileName: string) => void;
  onChangeActiveHandler: (fileName: string, handlerKey: string) => void;
};

export const ListEndpoints = ({
  endpoints,
  isLoading = false,
  pendingChanges = new Set(),
  pendingHandlerChanges = {},
  onAddPendingEndpoint,
  onOpenEndpointFile,
  onChangeActiveHandler,
}: ListEndpointsProps) => {
  const allEndpoints = endpoints?.listEndpoints ?? [];

  // loadError entries first, then normal entries — cada arquivo aparece em apenas UMA lista
  const enabled = [
    ...allEndpoints.filter((ep) => ep.loadError && ep.enabled),
    ...allEndpoints.filter((ep) => {
      if (ep.loadError) return false;
      const isPending = pendingChanges.has(ep.fileName);
      return isPending ? !ep.enabled : ep.enabled;
    }),
  ];

  const disabled = [
    ...allEndpoints.filter((ep) => ep.loadError && !ep.enabled),
    ...allEndpoints.filter((ep) => {
      if (ep.loadError) return false;
      const isPending = pendingChanges.has(ep.fileName);
      return isPending ? ep.enabled : !ep.enabled;
    }),
  ];

  const enabledCount = enabled.length;
  const disabledCount = disabled.length;

  return (
    <div className="flex-scroll-row-hidden" style={S.listEndpointsContainerStyle(isLoading)}>
      <EndpointSection variant="enabled" count={enabledCount}>
        <EmptyMessage show={enabledCount === 0} message="Nenhum endpoint habilitado" />
        {enabled.map((endpoint) => (
          <EndpointItem
            key={endpoint.serverAddress + endpoint.fileName}
            endpoint={endpoint}
            isPending={
              pendingChanges.has(endpoint.fileName) || endpoint.fileName in pendingHandlerChanges
            }
            pendingHandlerKey={pendingHandlerChanges[endpoint.fileName]}
            displayEnabled={true}
            onAddPendingEndpoint={onAddPendingEndpoint}
            onOpenEndpointFile={onOpenEndpointFile}
            onChangeActiveHandler={onChangeActiveHandler}
            isLoading={isLoading}
          />
        ))}
      </EndpointSection>

      <EndpointSection variant="disabled" count={disabledCount}>
        <EmptyMessage show={disabledCount === 0} message="Nenhum endpoint desabilitado" />
        {disabled.map((endpoint) => (
          <EndpointItem
            key={endpoint.fileName}
            endpoint={endpoint}
            isPending={
              pendingChanges.has(endpoint.fileName) || endpoint.fileName in pendingHandlerChanges
            }
            pendingHandlerKey={pendingHandlerChanges[endpoint.fileName]}
            displayEnabled={false}
            onAddPendingEndpoint={onAddPendingEndpoint}
            onOpenEndpointFile={onOpenEndpointFile}
            onChangeActiveHandler={onChangeActiveHandler}
            isLoading={isLoading}
          />
        ))}
      </EndpointSection>
    </div>
  );
};
