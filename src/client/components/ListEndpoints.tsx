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
    <ul
      style={{
        border: "1px solid green",
        padding: "5px 5px 0 5px",
        textDecoration: "none",
      }}
    >
      {endpoints?.listEndpoints.map((endpoint) => (
        <li
          key={endpoint.localhostAddress}
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            padding: "5px",
            marginBottom: "5px",
            border: "1px solid orange",
            // height: "50px",
          }}
        >
          <span style={{ flex: "1 100%" }}>{endpoint.description}</span>

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
