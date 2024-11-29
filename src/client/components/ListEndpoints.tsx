import type { Endpoint, Endpoints } from "../../types/Endpoints";

type ListEndpointsProps = {
  onToggleEndpoint: (endpoint: Endpoint) => void;
  endpoints: Endpoints | null;
};

export const ListEndpoints = ({
  endpoints,
  onToggleEndpoint,
}: ListEndpointsProps) => {
  return (
    <ul>
      {endpoints?.listEndpoints.map((endpoint) => (
        <li key={endpoint.localhostAddress}>
          <input
            type="checkbox"
            checked={endpoint.enabled}
            onChange={() => onToggleEndpoint(endpoint)}
          />
          <span>{endpoint.serverAddress}</span>
          <span> - </span>
          <span>{endpoint.localhostAddress}</span>
          {/* {JSON.stringify(endpoint)} */}
        </li>
      ))}
    </ul>
  );
};
