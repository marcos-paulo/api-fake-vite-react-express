import type { Endpoint, Endpoints } from "../../types/Endpoints";

type ListEndpointsProps = {
  onToggleEndpoint: (endpoint: Endpoint) => void;
  endpoints: Endpoints | null;
  isLoading?: boolean;
};

export const ListEndpoints = ({
  endpoints,
  onToggleEndpoint,
  isLoading = false,
}: ListEndpointsProps) => {
  return (
    <ul
      style={{
        border: "1px solid green",
        padding: "5px 5px 0 5px",
        textDecoration: "none",
        opacity: isLoading ? 0.6 : 1,
        pointerEvents: isLoading ? "none" : "auto",
        transition: "opacity 0.3s ease",
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
            disabled={isLoading}
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
